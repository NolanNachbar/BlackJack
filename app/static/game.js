// Casino Blackjack - Continuous Table Experience

let gameState = null;
let currentHandIndex = 0;
let selectedChipValue = 25; // Default chip selection
let currentBets = [0, 0, 0]; // Bets for positions 0, 1, 2
let lastBets = [0, 0, 0]; // For rebet functionality
let sessionStats = { wins: 0, losses: 0, pushes: 0, blackjacks: 0 };

// DOM Elements
const startModal = document.getElementById('start-modal');
const casinoTable = document.getElementById('casino-table');
const messageArea = document.getElementById('message-area');
const bankrollDisplay = document.getElementById('bankroll');
const dealerCards = document.getElementById('dealer-cards');
const dealerCount = document.getElementById('dealer-count');
const actionPanel = document.getElementById('action-panel');
const chipTray = document.getElementById('chip-tray');
const dealerMessage = document.getElementById('dealer-message');
const bustOverlay = document.getElementById('bust-overlay');

const startGameBtn = document.getElementById('start-game-btn');
const clearBetsBtn = document.getElementById('clear-bets-btn');
const rebetBtn = document.getElementById('rebet-btn');
const dealBtn = document.getElementById('deal-btn');
const betHalfBtn = document.getElementById('bet-half-btn');
const bet1xBtn = document.getElementById('bet-1x-btn');
const bet2xBtn = document.getElementById('bet-2x-btn');
const betMaxBtn = document.getElementById('bet-max-btn');

// Utility Functions
function showMessage(msg, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = msg;
    messageArea.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 4000);
}

function showDealerMessage(msg, duration = 2000) {
    dealerMessage.textContent = msg;
    dealerMessage.classList.remove('hidden');

    if (duration > 0) {
        setTimeout(() => {
            dealerMessage.classList.add('hidden');
        }, duration);
    }
}

function hideDealerMessage() {
    dealerMessage.classList.add('hidden');
}

let currentBankrollDisplay = 0;
let bankrollAnimationFrame = null;

function updateBankroll() {
    if (!gameState) return;

    const target = gameState.bankroll;
    const start = currentBankrollDisplay;
    const difference = target - start;
    const duration = 800; // ms
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (difference * easeOut));

        currentBankrollDisplay = current;
        bankrollDisplay.textContent = `$${current}`;

        if (progress < 1) {
            bankrollAnimationFrame = requestAnimationFrame(animate);
        }
    }

    if (bankrollAnimationFrame) {
        cancelAnimationFrame(bankrollAnimationFrame);
    }

    animate(startTime);
}

// API Calls
async function apiCall(endpoint, data = null) {
    const options = {
        method: data ? 'POST' : 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(`/api${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
        showMessage(result.message || 'An error occurred', 'error');
        throw new Error(result.message);
    }

    return result;
}

// Game Initialization
async function startGame() {
    const bankroll = parseInt(document.getElementById('starting-bankroll').value);

    if (bankroll < 10) {
        showMessage('Buy-in must be at least $10', 'error');
        return;
    }

    try {
        const result = await apiCall('/start', { bankroll });
        gameState = result.state;
        updateBankroll();

        startModal.classList.add('hidden');
        casinoTable.classList.remove('hidden');

        enterBettingPhase();
        showMessage('Welcome to the table! Place your bets.', 'success');
    } catch (error) {
        console.error('Start game error:', error);
    }
}

// Betting Phase
function enterBettingPhase() {
    currentBets = [0, 0, 0];
    clearAllCards();
    clearAllBettingCircles();
    activateBettingCircles();
    updateDealButton();

    // Show chip tray, hide action panel
    chipTray.classList.remove('hidden');
    actionPanel.classList.add('hidden');
    hideDealerMessage();

    // Show all seats during betting
    document.querySelectorAll('.player-position').forEach(pos => {
        pos.classList.remove('unused');
    });
}

function activateBettingCircles() {
    document.querySelectorAll('.betting-circle').forEach(circle => {
        circle.classList.add('active');
    });
}

function deactivateBettingCircles() {
    document.querySelectorAll('.betting-circle').forEach(circle => {
        circle.classList.remove('active');
    });
}

function clearAllCards() {
    // Clear dealer cards
    dealerCards.innerHTML = '';
    dealerCount.textContent = '';

    // Clear all player hands
    document.querySelectorAll('.player-hand .cards').forEach(el => el.innerHTML = '');
    document.querySelectorAll('.player-hand .hand-total').forEach(el => el.textContent = '');
    document.querySelectorAll('.player-hand .hand-status').forEach(el => {
        el.textContent = '';
        el.className = 'hand-status';
    });
}

function clearAllBettingCircles() {
    currentBets = [0, 0, 0];
    document.querySelectorAll('.bet-chips').forEach(el => el.innerHTML = '');
    document.querySelectorAll('.bet-amount').forEach(el => el.textContent = '$0');
}

function updateBettingCircle(position) {
    const betAmount = currentBets[position];
    const betAmountEl = document.querySelector(`.bet-amount[data-position="${position}"]`);
    const betChipsEl = document.querySelector(`.bet-chips[data-position="${position}"]`);

    if (!betAmountEl || !betChipsEl) {
        console.error(`Betting circle elements not found for position ${position}`);
        return;
    }

    betAmountEl.textContent = betAmount > 0 ? `$${betAmount}` : '$0';

    // Visual chip representation (matching chip tray style)
    betChipsEl.innerHTML = '';
    if (betAmount > 0) {
        // Determine chip denomination for color
        let chipValue = 1;
        if (betAmount >= 500) chipValue = 500;
        else if (betAmount >= 100) chipValue = 100;
        else if (betAmount >= 25) chipValue = 25;
        else if (betAmount >= 5) chipValue = 5;

        const chipEl = document.createElement('div');
        chipEl.className = 'chip bet-chip';
        chipEl.dataset.value = chipValue;

        const valueEl = document.createElement('span');
        valueEl.className = 'chip-value';
        valueEl.textContent = `$${betAmount}`;

        chipEl.appendChild(valueEl);
        betChipsEl.appendChild(chipEl);
    }
}

function placeBetOnPosition(position) {
    if (!gameState) {
        showMessage('Please start the game first', 'error');
        return;
    }

    if (gameState.phase !== 'betting') return;

    const newBet = currentBets[position] + selectedChipValue;

    // Validate bet
    if (newBet > 500) {
        showMessage('Maximum bet per hand is $500', 'error');
        return;
    }

    const totalBets = currentBets.reduce((sum, bet) => sum + bet, 0) - currentBets[position] + newBet;
    if (totalBets > gameState.bankroll) {
        showMessage('Insufficient chips', 'error');
        return;
    }

    currentBets[position] = newBet;
    updateBettingCircle(position);
    updateDealButton();
}

function clearBets() {
    if (!gameState) return;

    currentBets = [0, 0, 0];
    document.querySelectorAll('.bet-chips').forEach(el => el.innerHTML = '');
    document.querySelectorAll('.bet-amount').forEach(el => el.textContent = '$0');
    updateDealButton();
}

function rebet() {
    if (!gameState) {
        showMessage('Please start the game first', 'error');
        return;
    }

    if (lastBets.every(bet => bet === 0)) {
        showMessage('No previous bets to repeat', 'error');
        return;
    }

    const totalBet = lastBets.reduce((sum, bet) => sum + bet, 0);
    if (totalBet > gameState.bankroll) {
        showMessage('Insufficient chips for rebet', 'error');
        return;
    }

    currentBets = [...lastBets];
    currentBets.forEach((bet, pos) => updateBettingCircle(pos));
    updateDealButton();
}

function updateDealButton() {
    const totalBet = currentBets.reduce((sum, bet) => sum + bet, 0);
    const validBets = currentBets.filter(bet => bet >= 10);

    dealBtn.disabled = totalBet === 0 || validBets.length === 0;
}

// Deal Cards
async function dealCards() {
    // Check if at least one valid bet
    const validBets = currentBets.filter(bet => bet >= 10);

    if (validBets.length === 0) {
        showMessage('Place at least one bet of $10 or more', 'error');
        return;
    }

    // Save for rebet
    lastBets = [...currentBets];

    try {
        // Place bets - send full array to preserve position mapping
        console.log('Sending bets:', currentBets);
        const betResult = await apiCall('/bet', { bets: currentBets });
        gameState = betResult.state;
        console.log('Game state after bet:', gameState);
        updateBankroll();

        deactivateBettingCircles();
        dealBtn.disabled = true;

        // Fade unused seats
        fadeUnusedSeats();

        // Deal initial cards with API call first
        const dealResult = await apiCall('/deal', {});
        gameState = dealResult.state;
        console.log('Game state after deal:', gameState);

        // Staggered card dealing animation
        await staggeredCardDeal();

        // Dealer peek animation if needed
        if (dealResult.dealer_should_peek) {
            showDealerMessage('Dealer checking for blackjack...', 1500);
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        if (dealResult.dealer_blackjack) {
            showDealerMessage('Dealer has Blackjack!', 3000);
            await new Promise(resolve => setTimeout(resolve, 3000));
            await settleBets();
        } else {
            // Check for player blackjacks and offer insurance/even money
            await handleInsuranceAndEvenMoney();

            // Start playing hands
            currentHandIndex = 0;
            playCurrentHand();
        }
    } catch (error) {
        console.error('Deal error:', error);
        enterBettingPhase();
    }
}

function fadeUnusedSeats() {
    currentBets.forEach((bet, index) => {
        const position = document.querySelector(`.player-position[data-position="${index}"]`);
        if (bet < 10) {
            position.classList.add('unused');
        } else {
            position.classList.remove('unused');
        }
    });
}

// Staggered card dealing - deal one card at a time
async function staggeredCardDeal() {
    // Clear all cards first
    dealerCards.innerHTML = '';
    document.querySelectorAll('.player-hand .cards').forEach(el => el.innerHTML = '');

    const dealDelay = 300; // ms between each card

    // First round - one card to each player, then dealer
    for (let i = 0; i < gameState.hands.length; i++) {
        const hand = gameState.hands[i];
        const position = hand.position !== undefined ? hand.position : i;
        const cardsContainer = document.querySelector(`.player-hand[data-position="${position}"] .cards`);

        if (hand.cards[0]) {
            const cardEl = createCardElement(hand.cards[0]);
            cardsContainer.appendChild(cardEl);
            playCardSound();
            await new Promise(resolve => setTimeout(resolve, dealDelay));
        }
    }

    // Dealer's first card (face down)
    if (gameState.dealer.cards[0]) {
        const cardEl = createCardElement(gameState.dealer.cards[0]);
        dealerCards.appendChild(cardEl);
        playCardSound();
        await new Promise(resolve => setTimeout(resolve, dealDelay));
    }

    // Second round - one card to each player, then dealer
    for (let i = 0; i < gameState.hands.length; i++) {
        const hand = gameState.hands[i];
        const position = hand.position !== undefined ? hand.position : i;
        const cardsContainer = document.querySelector(`.player-hand[data-position="${position}"] .cards`);

        if (hand.cards[1]) {
            const cardEl = createCardElement(hand.cards[1]);
            cardsContainer.appendChild(cardEl);
            playCardSound();
            await new Promise(resolve => setTimeout(resolve, dealDelay));
        }
    }

    // Dealer's second card (face up)
    if (gameState.dealer.cards[1]) {
        const cardEl = createCardElement(gameState.dealer.cards[1]);
        dealerCards.appendChild(cardEl);
        playCardSound();
        await new Promise(resolve => setTimeout(resolve, dealDelay));
    }

    // Update all totals after dealing
    gameState.hands.forEach((hand, index) => {
        const position = hand.position !== undefined ? hand.position : index;
        const totalContainer = document.querySelector(`.player-hand[data-position="${position}"] .hand-total`);
        const statusContainer = document.querySelector(`.player-hand[data-position="${position}"] .hand-status`);

        if (hand.total !== null) {
            if (hand.is_soft && hand.total <= 21) {
                const lowTotal = hand.total - 10;
                totalContainer.textContent = `${lowTotal}/${hand.total}`;
            } else {
                totalContainer.textContent = hand.total;
            }
        }

        if (hand.is_blackjack) {
            statusContainer.textContent = 'BLACKJACK';
            statusContainer.classList.add('blackjack');
        }
    });
}

// Handle insurance and even money offers
async function handleInsuranceAndEvenMoney() {
    const dealerUpcard = gameState.dealer.cards[1];
    if (!dealerUpcard || dealerUpcard.rank !== 'A') return;

    // Check for even money offers (player blackjack vs dealer Ace)
    for (let i = 0; i < gameState.hands.length; i++) {
        const hand = gameState.hands[i];
        if (hand.is_blackjack) {
            const takeEvenMoney = confirm(`Hand ${i + 1} has Blackjack!\n\nDealer shows Ace. Take EVEN MONEY (1:1 payout = $${hand.bet} immediately)?`);
            if (takeEvenMoney) {
                // Take even money - immediate payout
                const payout = hand.bet * 2;
                gameState.bankroll += payout;
                hand.finished = true;
                showMessage(`Even money accepted! Win $${payout}`, 'success');
                updateBankroll();
            }
        }
    }

    // Insurance prompt for non-blackjack hands
    for (let i = 0; i < gameState.hands.length; i++) {
        const hand = gameState.hands[i];
        if (!hand.is_blackjack && hand.insurance_bet === 0) {
            const maxInsurance = Math.min(Math.floor(hand.bet / 2), gameState.bankroll);
            if (maxInsurance > 0) {
                const takeInsurance = confirm(`Hand ${i + 1}: Dealer shows Ace.\n\nTake INSURANCE? (Max: $${maxInsurance})\n\nInsurance pays 2:1 if dealer has blackjack.`);
                if (takeInsurance) {
                    try {
                        const result = await apiCall('/insurance', {
                            hand_index: i,
                            amount: maxInsurance
                        });
                        if (result.success) {
                            gameState = result.state;
                            updateBankroll();
                            showMessage(`Insurance placed: $${maxInsurance}`, 'success');
                        }
                    } catch (error) {
                        console.error('Insurance error:', error);
                    }
                }
            }
        }
    }
}

// Play card sound effect
function playCardSound() {
    // Create simple whoosh sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        // Silently fail if audio not supported
    }
}

// Play Hands
function playCurrentHand() {
    if (currentHandIndex >= gameState.hands.length) {
        // All hands played, dealer's turn
        playDealer();
        return;
    }

    const hand = gameState.hands[currentHandIndex];

    // Skip if already finished or blackjack
    if (hand.finished || hand.is_blackjack || hand.surrendered || hand.is_bust) {
        currentHandIndex++;
        playCurrentHand();
        return;
    }

    highlightCurrentHand();
    showActionPanel();
}

function showActionPanel() {
    if (currentHandIndex >= gameState.hands.length) return;

    const hand = gameState.hands[currentHandIndex];
    const allowedActions = hand.allowed_actions || [];

    if (allowedActions.length === 0) {
        currentHandIndex++;
        playCurrentHand();
        return;
    }

    // Hide chip tray, show action panel
    chipTray.classList.add('hidden');
    actionPanel.classList.remove('hidden');

    // Update action label with hand position
    const actionLabel = document.querySelector('.action-label');
    if (actionLabel) {
        if (gameState.hands.length > 1) {
            actionLabel.textContent = `HAND ${currentHandIndex + 1} OF ${gameState.hands.length}`;
        } else {
            actionLabel.textContent = `HAND 1`;
        }
    }

    // Enable/disable action buttons based on allowed actions
    document.querySelectorAll('.action-btn').forEach(btn => {
        const action = btn.dataset.action;
        btn.disabled = !allowedActions.includes(action);
    });
}

function highlightCurrentHand() {
    // Get the position of the current hand
    const currentHand = gameState.hands[currentHandIndex];
    const currentPosition = currentHand ? (currentHand.position !== undefined ? currentHand.position : currentHandIndex) : -1;

    document.querySelectorAll('.player-hand').forEach((el) => {
        const position = parseInt(el.dataset.position);
        if (position === currentPosition) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

async function takeAction(action) {
    actionPanel.classList.add('hidden');

    try {
        const result = await apiCall('/action', {
            hand_index: currentHandIndex,
            action: action
        });

        gameState = result.state;
        renderGameState();

        // Show BUST overlay if player busted
        const currentHand = gameState.hands[currentHandIndex];
        if (currentHand && currentHand.is_bust) {
            bustOverlay.classList.remove('hidden');
            await new Promise(resolve => setTimeout(resolve, 1000));
            bustOverlay.classList.add('hidden');
        }

        await new Promise(resolve => setTimeout(resolve, 400));

        // Check if the current hand still has actions available
        if (currentHand && !currentHand.finished && !currentHand.is_bust && !currentHand.surrendered) {
            // Hand is still active, show actions again (allows multiple hits)
            playCurrentHand();
        } else {
            // Hand is finished, move to next
            currentHandIndex++;
            playCurrentHand();
        }
    } catch (error) {
        console.error('Action error:', error);
        showActionPanel();
    }
}

async function playDealer() {
    actionPanel.classList.add('hidden');

    // Check if all hands bust/surrendered
    const allHandsDone = gameState.hands.every(hand => hand.is_bust || hand.surrendered);
    if (allHandsDone) {
        showDealerMessage('All hands bust or surrendered', 2000);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await settleBets();
        return;
    }

    showDealerMessage('Dealer plays...', 1500);
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
        const result = await apiCall('/dealer', {});
        gameState = result.state;
        renderGameState();

        if (result.dealer_bust) {
            showDealerMessage('Dealer Busts!', 2000);
        } else {
            showDealerMessage(`Dealer stands at ${gameState.dealer.total}`, 2000);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        await settleBets();
    } catch (error) {
        console.error('Dealer error:', error);
    }
}

async function settleBets() {
    try {
        const result = await apiCall('/settle', {});
        gameState = result.state;
        updateBankroll();
        renderGameState();

        // Show results
        showResults(result.results);

        // Return to betting phase after delay
        await new Promise(resolve => setTimeout(resolve, 4000));

        if (gameState.phase === 'game_over') {
            showDealerMessage('Game Over - Insufficient chips', 0);
            showMessage('Game over! Reload to play again.', 'error');
        } else {
            enterBettingPhase();
            showMessage('Place your bets', 'success');
        }
    } catch (error) {
        console.error('Settle error:', error);
    }
}

function showResults(results) {
    let messages = [];
    results.forEach((result, idx) => {
        let msg = `Hand ${result.hand}: `;
        let outcomeClass = '';

        switch (result.outcome) {
            case 'blackjack':
                msg += `BLACKJACK! Win $${result.payout}`;
                outcomeClass = 'win';
                sessionStats.wins++;
                sessionStats.blackjacks++;
                break;
            case 'win':
                msg += `WIN! $${result.payout}`;
                outcomeClass = 'win';
                sessionStats.wins++;
                break;
            case 'push':
                msg += `PUSH - Return $${result.payout}`;
                outcomeClass = 'push';
                sessionStats.pushes++;
                break;
            case 'loss':
            case 'bust':
                msg += `LOSE`;
                outcomeClass = 'loss';
                sessionStats.losses++;
                break;
            case 'surrender':
                msg += `SURRENDER - Return $${result.payout}`;
                outcomeClass = 'push';
                sessionStats.pushes++;
                break;
        }
        messages.push(msg);

        // Add outcome marker to the hand
        const hand = gameState.hands[idx];
        if (hand) {
            const position = hand.position !== undefined ? hand.position : idx;
            const statusContainer = document.querySelector(`.player-hand[data-position="${position}"] .hand-status`);
            if (statusContainer) {
                statusContainer.textContent = result.outcome.toUpperCase();
                statusContainer.className = `hand-status ${outcomeClass}`;
            }
        }
    });

    // Update session stats display
    document.getElementById('stat-wins').textContent = sessionStats.wins;
    document.getElementById('stat-losses').textContent = sessionStats.losses;
    document.getElementById('stat-pushes').textContent = sessionStats.pushes;

    showDealerMessage(messages.join(' | '), 4000);
}

// Rendering
function renderGameState() {
    if (!gameState) return;

    // Render dealer hand
    renderDealerHand();

    // Render player hands (only active ones with bets)
    gameState.hands.forEach((hand, index) => {
        renderPlayerHand(hand, index);
    });
}

function renderDealerHand() {
    const currentCardCount = dealerCards.children.length;
    const newCardCount = gameState.dealer.cards.length;

    // Check if we need to flip the hole card
    const hadHiddenCard = Array.from(dealerCards.children).some(el => el.classList.contains('card-back'));
    const hasHiddenCard = gameState.dealer.cards.some(card => card.rank === '??');

    // Only add new cards, don't re-render existing ones
    if (newCardCount > currentCardCount) {
        for (let i = currentCardCount; i < newCardCount; i++) {
            const cardEl = createCardElement(gameState.dealer.cards[i]);
            dealerCards.appendChild(cardEl);
        }
    } else if (newCardCount < currentCardCount) {
        // Cards were removed (new round), clear and re-render all
        dealerCards.innerHTML = '';
        gameState.dealer.cards.forEach(card => {
            const cardEl = createCardElement(card);
            dealerCards.appendChild(cardEl);
        });
    } else if (hadHiddenCard && !hasHiddenCard) {
        // Flip the hole card (first card)
        const holeCard = dealerCards.children[0];
        if (holeCard && holeCard.classList.contains('card-back')) {
            flipCardToFront(holeCard, gameState.dealer.cards[0]);
        }
    }

    // Update dealer count display
    if (gameState.dealer.cards.length > 0) {
        if (gameState.dealer.total !== null) {
            // All cards visible - show total with soft hand notation
            if (gameState.dealer.is_soft && gameState.dealer.total <= 21) {
                // Soft hand: show as low/high (e.g., "6/16")
                const lowTotal = gameState.dealer.total - 10;
                dealerCount.textContent = `${lowTotal}/${gameState.dealer.total}`;
            } else {
                dealerCount.textContent = gameState.dealer.total;
            }
            dealerCount.style.visibility = 'visible';
        } else {
            // One card hidden - show visible card value only
            const visibleCard = gameState.dealer.cards.find(card => card.rank !== '??');
            if (visibleCard) {
                dealerCount.textContent = getCardValue(visibleCard.rank);
                dealerCount.style.visibility = 'visible';
            } else {
                dealerCount.textContent = '';
                dealerCount.style.visibility = 'hidden';
            }
        }
    } else {
        dealerCount.textContent = '';
        dealerCount.style.visibility = 'hidden';
    }
}

function flipCardToFront(cardElement, newCardData) {
    // Add flipping animation
    cardElement.classList.add('flipping');

    // After half the animation, change the card content
    setTimeout(() => {
        cardElement.classList.remove('card-back');
        cardElement.textContent = newCardData.display;

        if (newCardData.suit === '♥' || newCardData.suit === '♦') {
            cardElement.classList.add('red');
        }
    }, 300); // Halfway through the 0.6s animation

    // Remove animation class after it completes
    setTimeout(() => {
        cardElement.classList.remove('flipping');
    }, 600);
}

function getCardValue(rank) {
    if (rank === 'A') return 11;
    if (['J', 'Q', 'K'].includes(rank)) return 10;
    return parseInt(rank);
}

function renderPlayerHand(hand, index) {
    // Use the position field from the hand data to render in correct spot
    const position = hand.position !== undefined ? hand.position : index;
    console.log(`Rendering hand ${index}: position=${position}, cards=${hand.cards.length}`);
    const cardsContainer = document.querySelector(`.player-hand[data-position="${position}"] .cards`);
    const totalContainer = document.querySelector(`.player-hand[data-position="${position}"] .hand-total`);
    const statusContainer = document.querySelector(`.player-hand[data-position="${position}"] .hand-status`);

    if (!cardsContainer) {
        console.error(`Could not find card container for position ${position}`);
        return;
    }

    const currentCardCount = cardsContainer.children.length;
    const newCardCount = hand.cards.length;

    // Only add new cards, don't re-render existing ones
    if (newCardCount > currentCardCount) {
        for (let i = currentCardCount; i < newCardCount; i++) {
            const cardEl = createCardElement(hand.cards[i]);
            cardsContainer.appendChild(cardEl);
        }
    } else if (newCardCount < currentCardCount) {
        // Cards were removed (new round), clear and re-render all
        cardsContainer.innerHTML = '';
        hand.cards.forEach(card => {
            const cardEl = createCardElement(card);
            cardsContainer.appendChild(cardEl);
        });
    }

    if (hand.total !== null) {
        if (hand.is_soft && hand.total <= 21) {
            // Soft hand: show as low/high (e.g., "6/16")
            const lowTotal = hand.total - 10;
            totalContainer.textContent = `${lowTotal}/${hand.total}`;
        } else {
            totalContainer.textContent = hand.total;
        }
    } else {
        totalContainer.textContent = '';
    }

    statusContainer.textContent = '';
    statusContainer.className = 'hand-status';

    if (hand.is_blackjack) {
        statusContainer.textContent = 'BLACKJACK';
        statusContainer.classList.add('blackjack');
    } else if (hand.is_bust) {
        statusContainer.textContent = 'BUST';
        statusContainer.classList.add('bust');
    } else if (hand.surrendered) {
        statusContainer.textContent = 'SURRENDERED';
    } else if (hand.doubled) {
        statusContainer.textContent = 'DOUBLED';
    }
}

function createCardElement(card) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';

    // Check if this is a hidden card
    if (card.rank === '??') {
        cardEl.classList.add('card-back');
        cardEl.textContent = '';
    } else {
        if (card.suit === '♥' || card.suit === '♦') {
            cardEl.classList.add('red');
        }
        cardEl.textContent = card.display;
    }

    return cardEl;
}

// Event Listeners
startGameBtn.addEventListener('click', startGame);
dealBtn.addEventListener('click', dealCards);
clearBetsBtn.addEventListener('click', clearBets);
rebetBtn.addEventListener('click', rebet);

// Chip values array for +/- navigation
const chipValues = [1, 5, 25, 100, 500];
let currentChipIndex = 2; // Start at $25

function updateSelectedChip() {
    selectedChipValue = chipValues[currentChipIndex];

    // Update visual chip display
    const selectedChipVisual = document.getElementById('selected-chip-visual');
    selectedChipVisual.dataset.value = selectedChipValue;
    selectedChipVisual.querySelector('.chip-value').textContent = `$${selectedChipValue}`;

    // Update chip colors based on value
    selectedChipVisual.className = 'chip selected-chip';
}

// Plus/minus buttons
document.getElementById('increase-chip').addEventListener('click', () => {
    if (currentChipIndex < chipValues.length - 1) {
        currentChipIndex++;
        updateSelectedChip();
    }
});

document.getElementById('decrease-chip').addEventListener('click', () => {
    if (currentChipIndex > 0) {
        currentChipIndex--;
        updateSelectedChip();
    }
});

// Set default chip selection
updateSelectedChip();

// Betting circle clicks
document.querySelectorAll('.betting-circle').forEach(circle => {
    circle.addEventListener('click', (e) => {
        const position = parseInt(circle.dataset.position);
        console.log('Clicked betting circle, position:', position, 'dataset:', circle.dataset);

        if (isNaN(position)) {
            console.error('Invalid position from betting circle:', circle);
            return;
        }

        placeBetOnPosition(position);
    });
});

// Action buttons
document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        takeAction(action);
    });
});

// Strategy button
document.getElementById('strategy-btn').addEventListener('click', showBasicStrategy);

// Quick bet buttons
betHalfBtn.addEventListener('click', () => {
    if (!gameState || gameState.phase !== 'betting') return;
    const total = currentBets.reduce((sum, bet) => sum + bet, 0);
    const half = Math.floor(total / 2);
    currentBets = currentBets.map(bet => bet > 0 ? Math.floor(bet / 2) : 0);
    currentBets.forEach((bet, pos) => updateBettingCircle(pos));
    updateDealButton();
});

bet1xBtn.addEventListener('click', () => {
    if (!gameState || gameState.phase !== 'betting') return;
    rebet();
});

bet2xBtn.addEventListener('click', () => {
    if (!gameState || gameState.phase !== 'betting') return;
    const doubled = currentBets.map(bet => bet * 2);
    const total = doubled.reduce((sum, bet) => sum + bet, 0);
    if (total > gameState.bankroll) {
        showMessage('Insufficient chips for 2x bet', 'error');
        return;
    }
    if (doubled.some(bet => bet > 0 && bet > 500)) {
        showMessage('2x bet exceeds table maximum', 'error');
        return;
    }
    currentBets = doubled;
    currentBets.forEach((bet, pos) => updateBettingCircle(pos));
    updateDealButton();
});

betMaxBtn.addEventListener('click', () => {
    if (!gameState || gameState.phase !== 'betting') return;
    // Max bet on first position
    const maxBet = Math.min(500, gameState.bankroll);
    currentBets = [maxBet, 0, 0];
    currentBets.forEach((bet, pos) => updateBettingCircle(pos));
    updateDealButton();
});

// Basic Blackjack Strategy
function getBasicStrategy(playerTotal, dealerUpcard, isSoft, isPair, canDouble, canSurrender) {
    const dealerValue = getCardValue(dealerUpcard);

    // Surrender strategy (if available)
    if (canSurrender) {
        if (playerTotal === 16 && [9, 10, 11].includes(dealerValue)) {
            return 'SURRENDER';
        }
        if (playerTotal === 15 && dealerValue === 10) {
            return 'SURRENDER';
        }
    }

    // Pair splitting strategy
    if (isPair) {
        const cardRank = gameState.hands[currentHandIndex].cards[0].rank;

        // Always split Aces and 8s
        if (cardRank === 'A' || cardRank === '8') {
            return 'SPLIT';
        }

        // Never split 5s and 10s
        if (cardRank === '5' || ['10', 'J', 'Q', 'K'].includes(cardRank)) {
            return canDouble ? 'DOUBLE' : 'HIT';
        }

        // Split 2s, 3s, 7s against dealer 2-7
        if (['2', '3', '7'].includes(cardRank) && dealerValue >= 2 && dealerValue <= 7) {
            return 'SPLIT';
        }

        // Split 4s against dealer 5-6
        if (cardRank === '4' && dealerValue >= 5 && dealerValue <= 6) {
            return 'SPLIT';
        }

        // Split 6s against dealer 2-6
        if (cardRank === '6' && dealerValue >= 2 && dealerValue <= 6) {
            return 'SPLIT';
        }

        // Split 9s against dealer 2-9 except 7
        if (cardRank === '9' && dealerValue >= 2 && dealerValue <= 9 && dealerValue !== 7) {
            return 'SPLIT';
        }
    }

    // Soft hand strategy
    if (isSoft) {
        // Soft 19-21: always stand
        if (playerTotal >= 19) {
            return 'STAND';
        }

        // Soft 18: double against 2-6, hit against 9-A, stand otherwise
        if (playerTotal === 18) {
            if (canDouble && dealerValue >= 2 && dealerValue <= 6) {
                return 'DOUBLE';
            }
            if (dealerValue >= 9) {
                return 'HIT';
            }
            return 'STAND';
        }

        // Soft 17: double against 3-6, hit otherwise
        if (playerTotal === 17) {
            if (canDouble && dealerValue >= 3 && dealerValue <= 6) {
                return 'DOUBLE';
            }
            return 'HIT';
        }

        // Soft 13-16: double against 5-6, hit otherwise
        if (playerTotal >= 13 && playerTotal <= 16) {
            if (canDouble && dealerValue >= 5 && dealerValue <= 6) {
                return 'DOUBLE';
            }
            return 'HIT';
        }

        // Other soft hands: hit
        return 'HIT';
    }

    // Hard hand strategy
    if (playerTotal >= 17) {
        return 'STAND';
    }

    if (playerTotal >= 13 && playerTotal <= 16) {
        return dealerValue >= 2 && dealerValue <= 6 ? 'STAND' : 'HIT';
    }

    if (playerTotal === 12) {
        return dealerValue >= 4 && dealerValue <= 6 ? 'STAND' : 'HIT';
    }

    if (playerTotal === 11) {
        return canDouble ? 'DOUBLE' : 'HIT';
    }

    if (playerTotal === 10) {
        return (canDouble && dealerValue <= 9) ? 'DOUBLE' : 'HIT';
    }

    if (playerTotal === 9) {
        return (canDouble && dealerValue >= 3 && dealerValue <= 6) ? 'DOUBLE' : 'HIT';
    }

    return 'HIT';
}

function showBasicStrategy() {
    if (currentHandIndex >= gameState.hands.length) return;

    const hand = gameState.hands[currentHandIndex];
    const dealerUpcard = gameState.dealer.cards.find(card => card.rank !== '??');

    if (!dealerUpcard) return;

    const isPair = hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank;
    const canDouble = hand.allowed_actions.includes('double');
    const canSurrender = hand.allowed_actions.includes('surrender');
    const canSplit = hand.allowed_actions.includes('split');

    let recommendation = getBasicStrategy(
        hand.total,
        dealerUpcard.rank,
        hand.is_soft,
        isPair && canSplit,
        canDouble,
        canSurrender
    );

    // Check if recommended action is available
    if (!hand.allowed_actions.includes(recommendation.toLowerCase())) {
        // Fallback logic
        if (recommendation === 'DOUBLE' && !canDouble) {
            recommendation = 'HIT';
        } else if (recommendation === 'SPLIT' && !canSplit) {
            recommendation = getBasicStrategy(hand.total, dealerUpcard.rank, hand.is_soft, false, canDouble, canSurrender);
        } else if (recommendation === 'SURRENDER' && !canSurrender) {
            recommendation = 'HIT';
        }
    }

    // Show recommendation with explanation
    let explanation = '';
    if (hand.is_soft) {
        explanation = `Soft ${hand.total} vs Dealer ${dealerUpcard.display}`;
    } else if (isPair && canSplit) {
        explanation = `Pair of ${hand.cards[0].display}'s vs Dealer ${dealerUpcard.display}`;
    } else {
        explanation = `Hard ${hand.total} vs Dealer ${dealerUpcard.display}`;
    }

    showDealerMessage(`💡 ${explanation}\nOptimal: ${recommendation}`, 4000);
}
