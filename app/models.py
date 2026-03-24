"""Data models for Blackjack game."""
import random
from dataclasses import dataclass, field
from typing import List, Tuple


RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
SUITS = ["♠", "♥", "♦", "♣"]


def card_value(rank: str) -> int:
    """Return the blackjack value of a card rank."""
    if rank in {"J", "Q", "K"}:
        return 10
    if rank == "A":
        return 11
    return int(rank)


@dataclass
class Card:
    """Represents a playing card."""
    rank: str
    suit: str

    def __str__(self) -> str:
        return f"{self.rank}{self.suit}"

    def to_dict(self) -> dict:
        """Convert card to dictionary for JSON serialization."""
        return {"rank": self.rank, "suit": self.suit, "display": str(self)}


@dataclass
class Hand:
    """Represents a blackjack hand."""
    cards: List[Card] = field(default_factory=list)
    bet: int = 0
    doubled: bool = False
    surrendered: bool = False
    finished: bool = False
    insurance_bet: int = 0
    is_split_aces: bool = False

    def add_card(self, card: Card) -> None:
        """Add a card to this hand."""
        self.cards.append(card)

    def values(self) -> Tuple[int, bool]:
        """
        Calculate the total value of the hand.
        Returns (total, is_soft) where is_soft indicates if an ace counts as 11.
        """
        total = sum(card_value(c.rank) for c in self.cards)
        aces = sum(1 for c in self.cards if c.rank == "A")

        # Reduce aces from 11 to 1 until total <= 21
        while total > 21 and aces > 0:
            total -= 10
            aces -= 1

        # Check if hand is soft (has an ace counting as 11)
        soft = False
        if any(c.rank == "A" for c in self.cards):
            total_if_all_aces_low = sum(1 if c.rank == "A" else card_value(c.rank) for c in self.cards)
            soft = total != total_if_all_aces_low

        return total, soft

    def total(self) -> int:
        """Return the total value of the hand."""
        return self.values()[0]

    def is_soft(self) -> bool:
        """Return True if the hand is soft (has an ace counting as 11)."""
        return self.values()[1]

    def is_blackjack(self) -> bool:
        """Return True if this is a natural blackjack (21 with 2 cards)."""
        return len(self.cards) == 2 and self.total() == 21

    def is_bust(self) -> bool:
        """Return True if the hand is over 21."""
        return self.total() > 21

    def can_split(self) -> bool:
        """Return True if this hand can be split."""
        if len(self.cards) != 2:
            return False
        c1, c2 = self.cards
        return card_value(c1.rank) == card_value(c2.rank)

    def can_double(self) -> bool:
        """Return True if this hand can be doubled."""
        return len(self.cards) == 2 and not self.doubled

    def display(self, hide_first: bool = False) -> str:
        """Return a string representation of the hand's cards."""
        if hide_first and self.cards:
            return "[??] " + " ".join(str(c) for c in self.cards[1:])
        return " ".join(str(c) for c in self.cards)

    def to_dict(self, hide_first: bool = False) -> dict:
        """Convert hand to dictionary for JSON serialization."""
        if hide_first and self.cards:
            cards = [{"rank": "??", "suit": "", "display": "??"}] + [c.to_dict() for c in self.cards[1:]]
            total = None
        else:
            cards = [c.to_dict() for c in self.cards]
            total = self.total()

        return {
            "cards": cards,
            "display": self.display(hide_first),
            "total": total,
            "is_soft": self.is_soft() if not hide_first else False,
            "is_blackjack": self.is_blackjack() if not hide_first else False,
            "is_bust": self.is_bust() if not hide_first else False,
            "bet": self.bet,
            "doubled": self.doubled,
            "surrendered": self.surrendered,
            "finished": self.finished,
            "insurance_bet": self.insurance_bet,
            "is_split_aces": self.is_split_aces,
        }


class Shoe:
    """Represents a multi-deck shoe of cards."""

    def __init__(self, decks: int = 6, penetration: float = 0.75):
        self.decks = decks
        self.penetration = penetration
        self.cards: List[Card] = []
        self.shuffle()

    def shuffle(self) -> None:
        """Shuffle the shoe with the specified number of decks."""
        self.cards = [
            Card(rank, suit)
            for _ in range(self.decks)
            for suit in SUITS
            for rank in RANKS
        ]
        random.shuffle(self.cards)

    def draw(self) -> Card:
        """Draw a card from the shoe. Shuffle if empty."""
        if not self.cards:
            self.shuffle()
        return self.cards.pop()

    def needs_shuffle(self) -> bool:
        """Check if the cut card has been reached."""
        total_cards = self.decks * 52
        used_cards = total_cards - len(self.cards)
        return used_cards / total_cards >= self.penetration
