export interface Profile {
    name: string;
    email: string;
    picture: string;
  }
export interface Game {
    player: string;
    player_move: number;
    computer_move: number;
    result: number;
    bet_amount: number;
    timestamp: number;
  }
export interface EventData {
    caller: string,
    type: "Deposit" | "Withdraw" | "Bet" | "Get",
    amount: number,
    tx_hash: string,
    timestamp: number
}