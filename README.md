# Casino Blackjack - Flask Web Application

A realistic casino-style Blackjack game built with Flask, supporting up to 3 simultaneous hands.

## Features

- **Realistic Casino Rules**:
  - 6-deck shoe with automatic reshuffling
  - Dealer hits soft 17
  - Blackjack pays 3:2
  - Insurance pays 2:1
  - Late surrender allowed
  - Double after split allowed
  - Split up to 4 hands per original hand
  - Dealer peeks for blackjack

- **Gameplay**:
  - Play 1-3 hands simultaneously
  - Table limits: $10 - $500 per hand
  - All standard blackjack actions: Hit, Stand, Double, Split, Surrender
  - Real-time bankroll tracking

- **UI**:
  - Clean, casino-style interface
  - Dynamic gameplay with no page reloads
  - Visual chip denominations display
  - Responsive design for desktop and mobile

## Installation

1. **Clone or download this repository**

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Game

1. **Start the Flask server**:
   ```bash
   python app.py
   ```

2. **Open your browser** and navigate to:
   ```
   http://localhost:5000
   ```

3. **Play**:
   - Enter your starting bankroll
   - Select number of hands (1-3)
   - Place bets for each hand
   - Play using Hit, Stand, Double, Split, or Surrender
   - Watch the dealer play and see your results

## Project Structure

```
BlackJack/
├── app.py                 # Flask routes and server
├── app/
│   ├── __init__.py       # Package initialization
│   ├── models.py         # Card, Hand, Shoe classes
│   ├── game.py           # Core game logic
│   ├── static/
│   │   ├── style.css     # CSS styling
│   │   └── game.js       # Frontend JavaScript
│   └── templates/
│       └── index.html    # Main HTML template
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## Game Rules

- **Table Limits**: $10 - $500 per hand
- **Blackjack Payout**: 3:2 (bet $10, win $15)
- **Insurance Payout**: 2:1
- **Surrender**: Returns 50% of bet
- **Shoe**: 6 decks, reshuffled at 75% penetration
- **Dealer**: Hits soft 17, peeks for blackjack on Ace/10
- **Splits**: Up to 4 hands total, split aces receive one card only

## API Endpoints

- `POST /api/start` - Initialize game with bankroll
- `POST /api/bet` - Place bets for 1-3 hands
- `POST /api/deal` - Deal initial cards
- `POST /api/insurance` - Place insurance bet
- `POST /api/action` - Execute player action (hit/stand/double/split/surrender)
- `POST /api/dealer` - Execute dealer's turn
- `POST /api/settle` - Settle bets and determine outcomes
- `POST /api/reset` - Reset for new round
- `GET /api/state` - Get current game state

## Development

To modify game rules, edit the constants at the top of `app/game.py`:

```python
TABLE_MIN_BET = 10
TABLE_MAX_BET = 500
BLACKJACK_PAYOUT = 1.5
DEALER_HITS_SOFT_17 = True
# ... etc
```

## License

This is a sample project for educational purposes.
