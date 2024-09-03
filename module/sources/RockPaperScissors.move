/*
    This file is a copy of the original module published at
    https://explorer.aptoslabs.com/account/0x947d5d37b8d1498635e23e5bef4f8918967815e563aa428ab829587133b327e4/modules/code/RockPaperScissors?network=testnet

    The file contains orginal code along with comments.
*/

address owner {
module RockPaperScissors {
    use std::signer;
    use std::vector;
    use std::option::{ Option, get_with_default};
    use aptos_framework::randomness;
    use aptos_framework::coin;
    use aptos_framework::coin::Coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::event;

// Move types
    const ROCK: u8 = 1;
    const PAPER: u8 = 2;
    const SCISSORS: u8 = 3;

// Result types
    const DRAW: u8 = 1;
    const PLAYER_WINS: u8 = 2;
    const COMPUTER_WINS: u8 = 3;

// Event types
    const DEPOSIT: u8 = 1;
    const WITHDRAW: u8 = 2;
    const BET: u8 = 3;
    const GET: u8 = 4;

// Game Struct
    struct Game has key, store, copy, drop {
        player: address,
        player_move: u8,   
        computer_move: u8,
        result: u8,
        bet_amount: u64,
        timestamp: u64
    }


// Bank Struct
    struct GlobalBank has key {
        total_coins: Coin<AptosCoin>,
    }


// Games store
    struct GamesStore has key, drop {
        games: vector<Game>
    }


// Event struct
    #[event]
    struct Event has copy, drop, store {
        caller: address,
        type: u8,
        amount: u64
    }

// Initialize the bank when module is published
    fun init_module(account: &signer) {
        move_to(account, GlobalBank {
            total_coins: coin::zero<AptosCoin>(),
        });
    }

// Entry function to deposit coins in bank
    entry fun deposit_to_bank(account: &signer, amount: u64) acquires GlobalBank {

        assert!(amount > 0, 402); // 402 invalid input, you need to deposit SOME coins

        // Withdraw the coins from signer
        let deposit_coins: Coin<AptosCoin> = coin::withdraw(account, amount);

        // Merge the coins with total coins inside bank
        let bank = borrow_global_mut<GlobalBank>(@owner);
        coin::merge(&mut bank.total_coins, deposit_coins);

        // Emit a DEPOSIT event
        event::emit(Event{
            caller: signer::address_of(account),
            type: 1,
            amount
        })
    }

// Entry function to withdraw the coins from bank and send it to signer address (Ideally, should be accessible to admins only)
    entry fun withdraw_to_wallet(account: &signer, amount: Option<u64>) acquires GlobalBank{
        let signer_address = signer::address_of(account);

        /*
            The following assertion is commentified so that anyone can test this function without having to
            publish their own module.
        */

        // Allow only authorized person to withdraw the coins
        // assert!( signer_address == @owner || signer_address == @adnarayan, 403); // 403 unauthorized access

        // Get the bank balance
        let bank = borrow_global_mut<GlobalBank>(@owner);
        let bank_balance = coin::value(&bank.total_coins);
        
        assert!(bank_balance > 0, 401); // 401 not enough balance; can't withdraw if bank has 0 balance
        let withdrawal_amount = get_with_default(&amount, bank_balance); // Get the withdrawal amount if a value is provided, else withdraw all the coins.
        assert!(withdrawal_amount > 0, 402); // 402 invalid input; Withdrawal amount should be greater than 0.

        if (withdrawal_amount > bank_balance) withdrawal_amount = bank_balance; // If the input amount is too large, limit it to bank balance

        // Extract the coins and send it to signer address
        let withdrawal_coins: Coin<AptosCoin> = coin::extract(&mut bank.total_coins, withdrawal_amount);
        coin::deposit(signer_address, withdrawal_coins);

        // Emit a WITHDRAW event
        event::emit(Event{
            caller: signer::address_of(account),
            type: 2,
            amount: withdrawal_amount
        })
    }


// Entry function to start a gem and generate a RANDOM computer move
    #[randomness]
    public(friend) entry fun start_game(account: &signer, player_move: u8, bet_amount: u64, timestamp: u64) acquires GlobalBank, GamesStore {
        let player = signer::address_of(account);

        // If the GamesStore for player does not exist, create and move one!
        if (!exists<GamesStore>(player)) {
            let new_games_store = GamesStore { games: vector::empty<Game>() };
            move_to(account, new_games_store)
        };

        assert!(player_move == 1 || player_move == 2 || player_move == 3, 402); // 402 invalid input

        let games_store = borrow_global_mut<GamesStore>(signer::address_of(account));

        // Withdraw the bet amount, if any from player and merge the coins in Global Bank
        if (bet_amount > 0) {
            let deposit_coins: Coin<AptosCoin> = coin::withdraw(account, bet_amount);
            let bank = borrow_global_mut<GlobalBank>(@owner);
            assert!(bet_amount <= coin::value(&bank.total_coins), 401); // 401 not enough balance
            coin::merge(&mut bank.total_coins, deposit_coins);
        };

        let computer_move = randomness::u8_range(1, 4); // Generating a random computer move

        // Creating a new Game object, result is UNDECLARED for now
        let game = Game {
            player,
            player_move,
            computer_move,
            result: 0,
            bet_amount,
            timestamp
        };

        vector::push_back(&mut games_store.games, game); // Push the Game object in Games Store

        // Emit a BET event
        event::emit(Event{
            caller: signer::address_of(account),
            type: 3,
            amount: bet_amount
        })
    }

// Entry function to finalize the result and send coins to the player address according to the result
    public entry fun finalize_results(account: &signer) acquires GlobalBank, GamesStore {
        let bank = borrow_global_mut<GlobalBank>(@owner);
        let player = signer::address_of(account);

        // If the Games Store for the player does not exist, create and move one!
        if (!exists<GamesStore>(player)) {
            let new_games_store = GamesStore { games: vector::empty<Game>() };
            move_to(account, new_games_store)
        };

        // Borrowing the mutable games list
        let games_store = borrow_global_mut<GamesStore>(player);
        let games_list = &mut games_store.games;

        let i = 0;
        let length = vector::length(games_list);

        // Loop through the games and finalize the result for any game that is UNDECLARED
        while (i < length) {
            let game: &mut Game = vector::borrow_mut<Game>(games_list, i);
            i = i + 1;
            
            // Finalize the result for UNDECLARED game results
            if (game.result == 0) {
                let withdrawal_amount = 0;
                let result = determine_winner(game.player_move, game.computer_move); // Determine the result based on player and computer moves
                if (result == PLAYER_WINS) {
                    // Send 1.8x coins to player if he wins
                    withdrawal_amount = game.bet_amount * 18 / 10;
                    let withdrawal_coins: Coin<AptosCoin> = coin::extract(&mut bank.total_coins, withdrawal_amount);
                    coin::deposit(game.player, withdrawal_coins);
                } else if (result == DRAW) {
                    // Send the bet amount if game draws
                    withdrawal_amount = game.bet_amount;
                    let withdrawal_coins: Coin<AptosCoin> = coin::extract(&mut bank.total_coins, withdrawal_amount);
                    coin::deposit(game.player, withdrawal_coins);
                } else {
                    // Nothing to do if the player lost
                };

                game.result = result; // Update the game result

                // Emit a GET event
                event::emit(Event{
                    caller: signer::address_of(account),
                    type: 4,
                    amount: withdrawal_amount
                })
            }
        }
    }

// Function to determine the result based on player and computer moves
    fun determine_winner(player_move: u8, computer_move: u8): u8 {
        if (player_move == computer_move) {
            DRAW
        } else if (
            (player_move == ROCK && computer_move == SCISSORS) ||
            (player_move == PAPER && computer_move == ROCK) ||
            (player_move == SCISSORS && computer_move == PAPER)
        ) {
            PLAYER_WINS
        } else {
            COMPUTER_WINS
        }
    }

// Function to view the list of games plaed by a player
    #[view]
    public fun get_games(player: address): vector<Game> acquires GamesStore {
        if (exists<GamesStore>(player)) {
            borrow_global<GamesStore>(player).games
        } else {
            vector::empty<Game>()
        }
    }

// Function to get the current balance of the bank
    #[view]
    public fun get_bank_balance(): u64 acquires GlobalBank {
        let bank = borrow_global<GlobalBank>(@owner);
        coin::value(&bank.total_coins)
    }
}
}