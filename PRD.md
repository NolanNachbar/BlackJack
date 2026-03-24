1. Overview

This product is a web-based, single-player casino-style Blackjack game built using Python (Flask). The user plays up to three simultaneous hands against a dealer, following realistic casino rules, betting limits, and chip denominations.

The application emphasizes:

Realistic gameplay (rules, payouts, dealer behavior)
Clean, minimal UI
Fast interaction loop (no unnecessary friction)
Accurate bankroll and betting mechanics 2. Goals
Primary Goals
Deliver a realistic Blackjack experience comparable to a casino table
Support up to 3 concurrent player hands
Implement accurate betting, payouts, and rule logic
Provide a simple, intuitive web interface
Secondary Goals
Maintain clean, modular backend logic for extensibility
Allow rule customization via config
Enable future features (analytics, multiplayer, etc.) 3. Non-Goals
Multiplayer or live dealer gameplay
Real-money transactions
Advanced graphics or animations (initial version is minimal)
Mobile app (web responsive is sufficient) 4. Target Users
Casual players who want to practice Blackjack
Users interested in strategy testing
Developers experimenting with Flask-based games 5. Key Features
5.1 Game Setup
User sets starting bankroll
Table limits enforced (e.g., $10–$500)
Uses a multi-deck shoe (default: 6 decks)
5.2 Gameplay
Up to 3 player hands per round
Dealer vs player(s)
Actions:
Hit
Stand
Double
Split
Surrender
Insurance
5.3 Rules (Default)
Blackjack pays 3:2
Dealer hits soft 17
Insurance pays 2:1
Double after split allowed
Late surrender allowed
Split up to 4 hands
Split aces receive one card only
Dealer peeks for blackjack
5.4 Betting System
Integer betting with visual chip breakdown
Standard chip sizes:
$1, $5, $25, $100, $500
Bankroll persists across rounds
5.5 Game Flow
Place bets (1–3 hands)
Initial deal
Insurance (if applicable)
Player actions per hand
Dealer plays
Settlement and payouts 6. User Experience (UX)
6.1 Design Principles
Minimalist layout
Clear state visibility (cards, totals, bets)
Immediate feedback on actions
No page reloads during gameplay (AJAX or fetch) 7. UI Structure
7.1 Main Game Layout
Layout Sections

---

| DEALER AREA |
| [Dealer Cards + Total] |

---

        HAND 1        HAND 2        HAND 3
    [Cards + Total] [Cards + Total] [Cards + Total]
    [Bet Amount]    [Bet Amount]    [Bet Amount]

---

| ACTION PANEL |
| [Hit] [Stand] [Double] [Split] [Surrender] |

---

## | BANKROLL | CURRENT BETS | CHIP SELECTOR |

8. Functional Requirements
   8.1 Game State Management
   Maintain:
   Bankroll
   Active hands
   Dealer hand
   Shoe state
   Store in server session or backend state
   8.2 Card Engine
   6-deck shoe
   Shuffle logic
   Cut-card reshuffle trigger (~75% penetration)
   8.3 Hand Logic
   Correct ace handling (soft/hard totals)
   Blackjack detection
   Bust logic
   Split handling (including aces rules)
   8.4 Dealer Logic
   Reveal hidden card after player actions
   Hit/stand logic based on rules
   Soft 17 handling configurable
   8.5 Betting Logic
   Validate bets within limits
   Deduct bets immediately
   Handle:
   Doubles
   Splits
   Insurance
   8.6 Payout Logic
   Blackjack: 3:2
   Insurance: 2:1
   Push handling
   Surrender: return 50%
   8.7 Action Validation
   Dynamically enable valid actions per hand:
   Cannot double after hitting
   Cannot split invalid hands
   Split limits enforced
   Split aces restrictions
9. API Design (Flask)
   Endpoints
   POST /start

- Initialize game with bankroll

POST /bet

- Submit bets for 1–3 hands

POST /deal

- Deal initial cards

POST /action

- Body: {hand_id, action}
- Actions: hit, stand, double, split, surrender

POST /dealer

- Execute dealer turn

GET /state

- Return full game state (JSON)

POST /reset

- Reset round

10. Data Models
    Game State (JSON)
    {
    "bankroll": 1000,
    "dealer": {
    "cards": ["10♠", "??"],
    "total": null
    },
    "hands": [
    {
    "cards": ["8♣", "8♦"],
    "total": 16,
    "bet": 50,
    "status": "active",
    "flags": {
    "doubled": false,
    "split": true,
    "surrendered": false
    }
    }
    ]
    }
11. Technical Architecture
    11.1 Backend
    Python 3.x
    Flask
    Session-based state or lightweight in-memory store
    11.2 Frontend
    HTML/CSS (minimal)
    Vanilla JS or lightweight framework
    Fetch API for communication
    11.3 Suggested Structure
    /app
    /static
    /templates
    game.py # core logic
    routes.py # Flask routes
    models.py # data models
    utils.py
12. Constraints
    Single-user session (no shared state)
    No persistent database required initially
    Must run locally and deploy easily (e.g., Heroku, Render)
13. Edge Cases
    Player bankroll insufficient mid-round
    Multiple splits reaching limit
    Dealer blackjack vs player blackjack
    Insurance payout timing
    Soft/hard ace recalculation
    All hands bust before dealer turn
14. Metrics for Success
    Game runs without rule inconsistencies
    No invalid actions allowed
    Accurate bankroll tracking across rounds
    Smooth UI interaction (no confusion or delays)
15. Future Enhancements
    Basic strategy advisor
    Card counting statistics
    Multiplayer mode
    Persistent user accounts
    Animations and enhanced UI
    Side bets (Perfect Pairs, 21+3)
16. Open Questions
    Should rules be configurable via UI?
    Should chip-based betting replace numeric input?
    Should game state persist across browser refresh?
17. Summary

This product delivers a realistic, minimal, and extensible Blackjack experience using Flask. The focus is correctness of rules, clarity of UI, and maintainable backend design.
