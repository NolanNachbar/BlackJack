"""Core Blackjack game logic."""
from typing import List, Optional, Dict, Any
from app.models import Hand, Shoe, card_value


# Game configuration
TABLE_MIN_BET = 10
TABLE_MAX_BET = 500
BLACKJACK_PAYOUT = 1.5
INSURANCE_PAYOUT = 2.0
NUM_DECKS = 6
CUT_CARD_PENETRATION = 0.75

DEALER_HITS_SOFT_17 = True
DOUBLE_AFTER_SPLIT = True
LATE_SURRENDER = True
MAX_HANDS_AFTER_SPLIT = 4
HIT_SPLIT_ACES = False
RESPLIT_ACES = False

CHIP_SIZES = [500, 100, 25, 5, 1]


class BlackjackGame:
    """Manages a blackjack game session."""

    def __init__(self, bankroll: int):
        self.bankroll = bankroll
        self.shoe = Shoe(NUM_DECKS, CUT_CARD_PENETRATION)
        self.dealer = Hand()
        self.player_hands: List[Hand] = []
        self.hand_positions: List[int] = []  # Track which positions (0-2) have hands
        self.split_counts: List[int] = []
        self.phase = "betting"  # betting, dealing, playing, dealer, settlement, game_over

    def format_chips(self, amount: int) -> str:
        """Format an amount as chip denominations."""
        if amount <= 0:
            return "$0"
        parts = []
        remaining = amount
        for chip in CHIP_SIZES:
            count, remaining = divmod(remaining, chip)
            if count:
                parts.append(f"{count}x${chip}")
        return " ".join(parts)

    def place_bets(self, bets: List[int]) -> Dict[str, Any]:
        """
        Place bets for 1-3 hands.
        Returns result dict with success status and message.
        """
        if self.phase != "betting":
            return {"success": False, "message": "Not in betting phase"}

        if not bets or len(bets) > 3:
            return {"success": False, "message": "Must bet on 1-3 hands"}

        # Filter out zero bets (empty positions)
        valid_bets = [bet for bet in bets if bet > 0]

        if not valid_bets:
            return {"success": False, "message": "Must place at least one bet"}

        total_bet = sum(valid_bets)
        if total_bet > self.bankroll:
            return {"success": False, "message": "Insufficient bankroll"}

        # Validate only non-zero bets
        for bet in valid_bets:
            if bet < TABLE_MIN_BET or bet > TABLE_MAX_BET:
                return {"success": False, "message": f"Bets must be between ${TABLE_MIN_BET} and ${TABLE_MAX_BET}"}

        # Deduct bets from bankroll
        self.bankroll -= total_bet

        # Create hands and track positions
        self.player_hands = []
        self.hand_positions = []
        for position, bet in enumerate(bets):
            if bet > 0:
                self.player_hands.append(Hand(bet=bet))
                self.hand_positions.append(position)

        self.split_counts = [0] * len(self.player_hands)

        self.phase = "dealing"
        return {"success": True, "message": f"Bets placed: ${total_bet}"}

    def initial_deal(self) -> Dict[str, Any]:
        """Deal initial cards. Returns game state."""
        if self.phase != "dealing":
            return {"success": False, "message": "Not in dealing phase"}

        # Check if shoe needs shuffle
        if self.shoe.needs_shuffle():
            self.shoe.shuffle()

        # Deal two cards to each hand and dealer
        for _ in range(2):
            for hand in self.player_hands:
                hand.add_card(self.shoe.draw())
            self.dealer.add_card(self.shoe.draw())

        # Check for dealer blackjack (peek)
        upcard = self.dealer.cards[1]
        dealer_should_peek = card_value(upcard.rank) in (10, 11)
        dealer_has_blackjack = False

        if dealer_should_peek:
            if self.dealer.is_blackjack():
                self.phase = "settlement"
                dealer_has_blackjack = True

        if not dealer_has_blackjack:
            self.phase = "playing"

        return {
            "success": True,
            "dealer_blackjack": dealer_has_blackjack,
            "dealer_should_peek": dealer_should_peek,
        }

    def place_insurance(self, hand_index: int, amount: int) -> Dict[str, Any]:
        """Place an insurance bet on a specific hand."""
        if hand_index < 0 or hand_index >= len(self.player_hands):
            return {"success": False, "message": "Invalid hand index"}

        hand = self.player_hands[hand_index]
        upcard = self.dealer.cards[1]

        if upcard.rank != "A":
            return {"success": False, "message": "Insurance only available when dealer shows Ace"}

        max_insurance = hand.bet // 2
        if amount > max_insurance or amount > self.bankroll:
            return {"success": False, "message": f"Invalid insurance amount (max ${max_insurance})"}

        hand.insurance_bet = amount
        self.bankroll -= amount
        return {"success": True, "message": f"Insurance placed: ${amount}"}

    def get_allowed_actions(self, hand_index: int) -> List[str]:
        """Get list of allowed actions for a specific hand."""
        if hand_index < 0 or hand_index >= len(self.player_hands):
            return []

        hand = self.player_hands[hand_index]
        if hand.finished or hand.is_bust() or hand.surrendered:
            return []

        # No actions if hand is exactly 21 (should be auto-finished)
        if hand.total() == 21:
            return []

        actions = ["hit", "stand"]

        split_count = self.split_counts[hand_index]

        if hand.can_double() and (DOUBLE_AFTER_SPLIT or split_count == 0):
            if self.bankroll >= hand.bet:
                actions.append("double")

        if (
            hand.can_split()
            and len(self.player_hands) < 12
            and split_count < (MAX_HANDS_AFTER_SPLIT - 1)
            and self.bankroll >= hand.bet
        ):
            if hand.cards[0].rank == "A":
                if RESPLIT_ACES or not hand.is_split_aces:
                    actions.append("split")
            else:
                actions.append("split")

        if LATE_SURRENDER and len(hand.cards) == 2:
            actions.append("surrender")

        if hand.is_split_aces and not HIT_SPLIT_ACES:
            actions = [a for a in actions if a not in {"hit", "double", "split", "surrender"}]
            if "stand" not in actions:
                actions.append("stand")

        return actions

    def take_action(self, hand_index: int, action: str) -> Dict[str, Any]:
        """
        Execute an action on a specific hand.
        Returns result dict with success status and message.
        """
        if self.phase != "playing":
            return {"success": False, "message": "Not in playing phase"}

        if hand_index < 0 or hand_index >= len(self.player_hands):
            return {"success": False, "message": "Invalid hand index"}

        hand = self.player_hands[hand_index]
        allowed = self.get_allowed_actions(hand_index)

        if action not in allowed:
            return {"success": False, "message": f"Action '{action}' not allowed"}

        if action == "hit":
            hand.add_card(self.shoe.draw())
            if hand.is_bust():
                hand.finished = True
                return {"success": True, "message": "Busted!", "bust": True}
            # Auto-stand on 21
            if hand.total() == 21:
                hand.finished = True
                return {"success": True, "message": "21! Auto-standing"}
            return {"success": True, "message": "Hit"}

        elif action == "stand":
            hand.finished = True
            return {"success": True, "message": "Standing"}

        elif action == "double":
            self.bankroll -= hand.bet
            hand.bet *= 2
            hand.doubled = True
            hand.add_card(self.shoe.draw())
            hand.finished = True
            if hand.is_bust():
                return {"success": True, "message": "Doubled and busted", "bust": True}
            return {"success": True, "message": "Doubled down"}

        elif action == "surrender":
            hand.surrendered = True
            hand.finished = True
            return {"success": True, "message": "Surrendered"}

        elif action == "split":
            self.bankroll -= hand.bet
            left_card = hand.cards[0]
            right_card = hand.cards[1]

            # Modify current hand
            hand.cards = [left_card]
            hand.add_card(self.shoe.draw())
            if left_card.rank == "A":
                hand.is_split_aces = True
                if not HIT_SPLIT_ACES:
                    hand.finished = True

            # Create new hand
            new_hand = Hand(cards=[right_card], bet=hand.bet)
            new_hand.add_card(self.shoe.draw())
            if right_card.rank == "A":
                new_hand.is_split_aces = True
                if not HIT_SPLIT_ACES:
                    new_hand.finished = True

            # Insert new hand after current
            self.player_hands.insert(hand_index + 1, new_hand)
            self.split_counts.insert(hand_index + 1, self.split_counts[hand_index] + 1)
            self.split_counts[hand_index] += 1

            # Keep the same position for the split hand
            self.hand_positions.insert(hand_index + 1, self.hand_positions[hand_index])

            return {"success": True, "message": "Hand split"}

        return {"success": False, "message": "Unknown action"}

    def all_hands_finished(self) -> bool:
        """Check if all player hands are finished."""
        return all(hand.finished or hand.is_bust() or hand.surrendered for hand in self.player_hands)

    def play_dealer(self) -> Dict[str, Any]:
        """Execute dealer's turn. Returns result."""
        if self.phase != "playing":
            return {"success": False, "message": "Not ready for dealer turn"}

        # Skip dealer turn if all hands bust or surrendered
        if all(hand.is_bust() or hand.surrendered for hand in self.player_hands):
            self.phase = "settlement"
            return {"success": True, "message": "All hands bust/surrendered, dealer doesn't play"}

        # Dealer plays with safeguard against infinite loops
        max_cards = 12  # Safety limit to prevent infinite loops
        cards_drawn = 0
        while self.dealer_should_hit() and cards_drawn < max_cards and not self.dealer.is_bust():
            self.dealer.add_card(self.shoe.draw())
            cards_drawn += 1

        self.phase = "settlement"
        if self.dealer.is_bust():
            return {"success": True, "message": "Dealer busts!", "dealer_bust": True}
        return {"success": True, "message": f"Dealer stands at {self.dealer.total()}"}

    def dealer_should_hit(self) -> bool:
        """Determine if dealer should hit based on rules."""
        total, soft = self.dealer.values()
        if total < 17:
            return True
        if total == 17 and soft and DEALER_HITS_SOFT_17:
            return True
        return False

    def settle_bets(self) -> Dict[str, Any]:
        """
        Settle all bets and update bankroll.
        Returns results for each hand.
        """
        if self.phase != "settlement":
            return {"success": False, "message": "Not in settlement phase"}

        dealer_has_blackjack = self.dealer.is_blackjack()
        dealer_total = self.dealer.total()
        dealer_bust = self.dealer.is_bust()

        results = []

        for idx, hand in enumerate(self.player_hands):
            result = {"hand": idx + 1, "bet": hand.bet}
            payout = 0

            # Handle insurance
            if hand.insurance_bet > 0:
                if dealer_has_blackjack:
                    insurance_payout = int(hand.insurance_bet * (1 + INSURANCE_PAYOUT))
                    payout += insurance_payout
                    result["insurance"] = f"wins ${insurance_payout}"
                else:
                    result["insurance"] = f"loses ${hand.insurance_bet}"

            # Handle main bet
            if hand.surrendered:
                payout += hand.bet // 2
                result["outcome"] = "surrender"
                result["payout"] = payout

            elif dealer_has_blackjack:
                if hand.is_blackjack():
                    payout += hand.bet
                    result["outcome"] = "push"
                    result["payout"] = payout
                else:
                    result["outcome"] = "loss"
                    result["payout"] = 0

            elif hand.is_blackjack():
                payout += int(hand.bet * (1 + BLACKJACK_PAYOUT))
                result["outcome"] = "blackjack"
                result["payout"] = payout

            elif hand.is_bust():
                result["outcome"] = "bust"
                result["payout"] = 0

            elif dealer_bust:
                payout += hand.bet * 2
                result["outcome"] = "win"
                result["payout"] = payout

            else:
                player_total = hand.total()
                if player_total > dealer_total:
                    payout += hand.bet * 2
                    result["outcome"] = "win"
                    result["payout"] = payout
                elif player_total < dealer_total:
                    result["outcome"] = "loss"
                    result["payout"] = 0
                else:
                    payout += hand.bet
                    result["outcome"] = "push"
                    result["payout"] = payout

            self.bankroll += payout
            results.append(result)

        # Check game over
        if self.bankroll < TABLE_MIN_BET:
            self.phase = "game_over"
        else:
            self.phase = "betting"

        return {"success": True, "results": results, "new_bankroll": self.bankroll}

    def reset_round(self) -> Dict[str, Any]:
        """Reset for a new round."""
        self.dealer = Hand()
        self.player_hands = []
        self.split_counts = []
        self.phase = "betting"
        return {"success": True, "message": "New round started"}

    def get_state(self, hide_dealer: bool = True) -> Dict[str, Any]:
        """
        Get current game state as a dictionary.
        If hide_dealer is True, dealer's first card is hidden during play.
        """
        return {
            "bankroll": self.bankroll,
            "phase": self.phase,
            "dealer": self.dealer.to_dict(hide_first=hide_dealer and self.phase == "playing"),
            "hands": [
                {
                    **hand.to_dict(),
                    "position": self.hand_positions[i] if i < len(self.hand_positions) else i,
                    "allowed_actions": self.get_allowed_actions(i) if self.phase == "playing" else [],
                }
                for i, hand in enumerate(self.player_hands)
            ],
            "hand_positions": self.hand_positions,
            "table_min": TABLE_MIN_BET,
            "table_max": TABLE_MAX_BET,
            "chips": CHIP_SIZES,
        }
