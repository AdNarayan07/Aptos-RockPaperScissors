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

// move types
    const ROCK: u8 = 1;
    const PAPER: u8 = 2;
    const SCISSORS: u8 = 3;

// result types
    const DRAW: u8 = 1;
    const PLAYER_WINS: u8 = 2;
    const COMPUTER_WINS: u8 = 3;

// event types
    const DEPOSIT: u8 = 1;
    const WITHDRAW: u8 = 2;
    const BET: u8 = 3;
    const GET: u8 = 4;

    struct Game has key, store, copy, drop {
        player: address,
        player_move: u8,   
        computer_move: u8,
        result: u8,
        bet_amount: u64,
        timestamp: u64
    }

    struct GlobalBank has key {
        total_coins: Coin<AptosCoin>,
    }

    struct GamesStore has key, drop {
        games: vector<Game>
    }

    #[event]
    struct Event has copy, drop, store {
        caller: address,
        type: u8,
        amount: u64
    }

    fun init_module(account: &signer) {
        move_to(account, GlobalBank {
            total_coins: coin::zero<AptosCoin>(),
        });
    }

    entry fun deposit_to_bank(account: &signer, amount: u64) acquires GlobalBank {
        assert!(amount > 0, 402); // 402 invalid input
        let deposit_coins: Coin<AptosCoin> = coin::withdraw(account, amount);
        let bank = borrow_global_mut<GlobalBank>(@owner);
        coin::merge(&mut bank.total_coins, deposit_coins);
        event::emit(Event{
            caller: signer::address_of(account),
            type: 1,
            amount
        })
    }

    entry fun withdraw_to_wallet(account: &signer, amount: Option<u64>) acquires GlobalBank{
        let signer_address = signer::address_of(account);

        // allow only authorized person to withdraw the coins | disabled for testing purpose
        // assert!( signer_address == @owner || signer_address == @adnarayan, 403); // 403 unauthorized access

        let bank = borrow_global_mut<GlobalBank>(@owner);
        let bank_balance = coin::value(&bank.total_coins);
        
        assert!(bank_balance > 0, 401); // 401 not enough balance
        let withdrawal_amount = get_with_default(&amount, bank_balance);
        assert!(withdrawal_amount > 0, 402); // 402 invalid input

        if (withdrawal_amount > bank_balance) withdrawal_amount = bank_balance;
        let withdrawal_coins: Coin<AptosCoin> = coin::extract(&mut bank.total_coins, withdrawal_amount);
        coin::deposit(signer_address, withdrawal_coins);
        event::emit(Event{
            caller: signer::address_of(account),
            type: 2,
            amount: withdrawal_amount
        })
    }

    #[randomness]
    public(friend) entry fun start_game(account: &signer, player_move: u8, bet_amount: u64, timestamp: u64) acquires GlobalBank, GamesStore {
        let player = signer::address_of(account);

        if (!exists<GamesStore>(player)) {
            let new_games_store = GamesStore { games: vector::empty<Game>() };
            move_to(account, new_games_store)
        };

        assert!(player_move == 1 || player_move == 2 || player_move == 3, 402); // 402 invalid input

        let games_store = borrow_global_mut<GamesStore>(signer::address_of(account));

        if (bet_amount > 0) {
            let deposit_coins: Coin<AptosCoin> = coin::withdraw(account, bet_amount);
            let bank = borrow_global_mut<GlobalBank>(@owner);
            assert!(bet_amount <= coin::value(&bank.total_coins), 401); // 401 not enough balance
            coin::merge(&mut bank.total_coins, deposit_coins);
        };

        let computer_move = randomness::u8_range(1, 4);

        let game = Game {
            player,
            player_move,
            computer_move,
            result: 0,
            bet_amount,
            timestamp
        };

        vector::push_back(&mut games_store.games, game);
        event::emit(Event{
            caller: signer::address_of(account),
            type: 3,
            amount: bet_amount
        })
    }

    public entry fun finalize_results(account: &signer) acquires GlobalBank, GamesStore {
        let bank = borrow_global_mut<GlobalBank>(@owner);
        let player = signer::address_of(account);

        if (!exists<GamesStore>(player)) {
            let new_games_store = GamesStore { games: vector::empty<Game>() };
            move_to(account, new_games_store)
        };

        let games_store = borrow_global_mut<GamesStore>(player);
        let games_list = &mut games_store.games;

        let i = 0;
        let length = vector::length(games_list);

        while (i < length) {
            let game: &mut Game = vector::borrow_mut<Game>(games_list, i);
            i = i + 1;
            
            if (game.result == 0) {
                let withdrawal_amount = 0;
                let result = determine_winner(game.player_move, game.computer_move);
                if (result == PLAYER_WINS) {
                    withdrawal_amount = game.bet_amount * 18 / 10;
                    let withdrawal_coins: Coin<AptosCoin> = coin::extract(&mut bank.total_coins, withdrawal_amount);
                    coin::deposit(game.player, withdrawal_coins);
                } else if (result == DRAW) {
                    withdrawal_amount = game.bet_amount;
                    let withdrawal_coins: Coin<AptosCoin> = coin::extract(&mut bank.total_coins, withdrawal_amount);
                    coin::deposit(game.player, withdrawal_coins);
                } else {
                    // nothing to do
                };
                game.result = result;
                event::emit(Event{
                    caller: signer::address_of(account),
                    type: 4,
                    amount: withdrawal_amount
                })
            }
        }
    }

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

    #[view]
    public fun get_games(player: address): vector<Game> acquires GamesStore {
        if (exists<GamesStore>(player)) {
            borrow_global<GamesStore>(player).games
        } else {
            vector::empty<Game>()
        }
    }

    #[view]
    public fun get_bank_balance(): u64 acquires GlobalBank {
        let bank = borrow_global<GlobalBank>(@owner);
        coin::value(&bank.total_coins)
    }
}
}