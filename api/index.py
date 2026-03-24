"""Flask application for Blackjack game."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, render_template, session, request, jsonify
from app.game import BlackjackGame

app = Flask(__name__, template_folder='../app/templates', static_folder='../app/static')
app.secret_key = 'your-secret-key-change-in-production'  # Change this in production!


def get_game() -> BlackjackGame:
    """Get or create the game instance from session."""
    if 'game_state' not in session:
        return None

    # Recreate game from session state
    game = BlackjackGame(session['game_state']['bankroll'])
    game.phase = session['game_state']['phase']

    # Restore dealer and hands
    from app.models import Hand, Card
    dealer_data = session['game_state']['dealer']
    game.dealer = Hand()
    for card_data in dealer_data['cards']:
        if card_data['rank'] != '??':
            game.dealer.add_card(Card(card_data['rank'], card_data['suit']))

    for hand_data in session['game_state']['hands']:
        hand = Hand(bet=hand_data['bet'])
        for card_data in hand_data['cards']:
            hand.add_card(Card(card_data['rank'], card_data['suit']))
        hand.doubled = hand_data['doubled']
        hand.surrendered = hand_data['surrendered']
        hand.finished = hand_data['finished']
        hand.insurance_bet = hand_data['insurance_bet']
        hand.is_split_aces = hand_data['is_split_aces']
        game.player_hands.append(hand)

    game.split_counts = session['game_state'].get('split_counts', [0] * len(game.player_hands))

    return game


def save_game(game: BlackjackGame) -> None:
    """Save game state to session."""
    state = game.get_state(hide_dealer=False)
    state['split_counts'] = game.split_counts
    session['game_state'] = state
    session.modified = True


@app.route('/')
def index():
    """Render the main game page."""
    return render_template('index.html')


@app.route('/api/start', methods=['POST'])
def start_game():
    """Initialize a new game with starting bankroll."""
    data = request.get_json()
    bankroll = data.get('bankroll', 1000)

    if bankroll < 10:
        return jsonify({"success": False, "message": "Bankroll must be at least $10"}), 400

    game = BlackjackGame(bankroll)
    save_game(game)

    return jsonify({"success": True, "state": game.get_state()})


@app.route('/api/bet', methods=['POST'])
def place_bets():
    """Place bets for 1-3 hands."""
    game = get_game()
    if not game:
        return jsonify({"success": False, "message": "Game not started"}), 400

    data = request.get_json()
    bets = data.get('bets', [])

    result = game.place_bets(bets)
    if result['success']:
        save_game(game)
        return jsonify({**result, "state": game.get_state()})

    return jsonify(result), 400


@app.route('/api/deal', methods=['POST'])
def deal_cards():
    """Deal initial cards."""
    game = get_game()
    if not game:
        return jsonify({"success": False, "message": "Game not started"}), 400

    result = game.initial_deal()
    save_game(game)

    hide_dealer = game.phase == "playing"
    return jsonify({**result, "state": game.get_state(hide_dealer=hide_dealer)})


@app.route('/api/insurance', methods=['POST'])
def place_insurance():
    """Place an insurance bet."""
    game = get_game()
    if not game:
        return jsonify({"success": False, "message": "Game not started"}), 400

    data = request.get_json()
    hand_index = data.get('hand_index', 0)
    amount = data.get('amount', 0)

    result = game.place_insurance(hand_index, amount)
    if result['success']:
        save_game(game)
        return jsonify({**result, "state": game.get_state()})

    return jsonify(result), 400


@app.route('/api/action', methods=['POST'])
def take_action():
    """Execute a player action (hit, stand, double, split, surrender)."""
    game = get_game()
    if not game:
        return jsonify({"success": False, "message": "Game not started"}), 400

    data = request.get_json()
    hand_index = data.get('hand_index', 0)
    action = data.get('action', '')

    result = game.take_action(hand_index, action)
    if result['success']:
        save_game(game)
        return jsonify({**result, "state": game.get_state()})

    return jsonify(result), 400


@app.route('/api/dealer', methods=['POST'])
def play_dealer():
    """Execute dealer's turn."""
    game = get_game()
    if not game:
        return jsonify({"success": False, "message": "Game not started"}), 400

    result = game.play_dealer()
    save_game(game)

    return jsonify({**result, "state": game.get_state(hide_dealer=False)})


@app.route('/api/settle', methods=['POST'])
def settle_bets():
    """Settle all bets and determine outcomes."""
    game = get_game()
    if not game:
        return jsonify({"success": False, "message": "Game not started"}), 400

    result = game.settle_bets()
    save_game(game)

    return jsonify({**result, "state": game.get_state(hide_dealer=False)})


@app.route('/api/reset', methods=['POST'])
def reset_round():
    """Reset for a new round."""
    game = get_game()
    if not game:
        return jsonify({"success": False, "message": "Game not started"}), 400

    result = game.reset_round()
    save_game(game)

    return jsonify({**result, "state": game.get_state()})


@app.route('/api/state', methods=['GET'])
def get_state():
    """Get current game state."""
    game = get_game()
    if not game:
        return jsonify({"success": False, "message": "Game not started"}), 400

    hide_dealer = game.phase == "playing"
    return jsonify({"success": True, "state": game.get_state(hide_dealer=hide_dealer)})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
