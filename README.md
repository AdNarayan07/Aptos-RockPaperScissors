# Aptos: Rock Paper Scissors
## Overview
This project focuses on upgrading the
[Aptos Rock Paper Scissors Game in **StackUp x Move on Aptos** Quest 3](https://earn.stackup.dev/campaigns/move-on-aptos-iii/quests/quest-3-rock-paper-scissors-game-with-aptos-roll-ec84)
which used [**Aptos Randomness API**](https://aptos.dev/en/build/smart-contracts/randomness) to generate a random computer move, enabling the users to play with computer.

Check out the application 👉 https://adnarayan-rock-paper-scissors.netlify.app

## Additional Features
- Allowing the players to [play the game multiple times] and [keep a record of the games](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/module/sources/RockPaperScissors.move#L130).
- Allowing the players to [bet APT coins](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/module/sources/RockPaperScissors.move#L143-L149).
- A [Bank to Store the Coins](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/module/sources/RockPaperScissors.move#L46-L49) and [give it to user after result](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/module/sources/RockPaperScissors.move#L197-L212).
- Allowing users to [deposit the coins to bank](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/module/sources/RockPaperScissors.move#L74-L91) (well, they won't get it back) so that the computer can bet the bank money.
- Admin only command (Allowed for everyone for testing purpose) to [withdraw from the bank](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/module/sources/RockPaperScissors.move#L94-L125) to their wallet.
- Emitting [events](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/module/sources/RockPaperScissors.move#L59-L64) to keep a record of games and transactions.

---

- Frontend to interact with the module using [**Aptos Keyless Signing**](https://aptos.dev/en/build/guides/aptos-keyless), built on [Aptos Keyless Example](https://github.com/aptos-labs/aptos-keyless-example) repository from **Aptos Labs**.
    - **[Home Page](#logging-in-and-playing-the-game)**
        - Showing the profile, address and wallet balance of currently logged in user and amount of APT in game bank.
        - Playing the game, and making APT bets (optional)
        - Fetching and displaying user's previous games.
    - **[Admin Page](#admin-page)**
        - Forms to deposit and withdraw coins to and from the game bank.
        - A list of all the events emitted, paginated, linking them to corresponding transactions in aptos explorer.
---

## Troubleshooting
- ⚠️ Please [fund your wallet with APT](#funding-your-wallet-from-the-faucet) token if you get **"Account Not Found"** or **"Insufficient Balance"** or **"Faucet Error"**.
- ⚠️ If you bet the amount which is very close to your current wallet balance, the result declaration might fail and you will get a **"INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE"** error with **"Result Undeclared"** warning, in such case [fund your wallet with APT token](#funding-your-wallet-from-the-faucet) and play a new game. This will declare the previously undeclared game results.
- ⚠️ If you get "INVALID_SIGNATURE" error, [clear the site data](#clearing-site-data-(in-chrome)) and then relogin.

    | Aptos API Error | Solution |
    |-------------|---------|
    | 404 Transaction Not Found | Try Later |
    |500 Internal Server Error | [Clear Site Data](#clearing-site-data-(in-chrome)) and Relogin |
    
## Running the Project Locally

### Prerequisites
1. [NodeJS and NPM](https://nodejs.org/)
2. [Aptos CLI](https://aptos.dev/en/build/cli) *(Only if you want to make changes to the move module and republish it)*
---

### Setting Up Project
```sh
git clone https://github.com/AdNarayan07/Aptos-RockPaperScissors
cd Aptos-RockPaperScissors
npm install
```

### Running the Project
```sh
npm run dev
```
Then visit http://localhost:5173/ to see and interact with the application. <br>
*⚠️ Don't change the port number on your own or the Google OAuth2 won't work!*

### Checking the  Restrictions for Admin Only Functions:
If you want to check if admin only restrictions work, follow these steps:
1. Navigate to module directory 
```sh
cd module
```

2. Initiate a new aptos testnet account
```sh
aptos init
```

3. Go to `module/.aptos/config.yaml` file and copy account address.
4. Replace the owner addresses in `module/move.toml` and `src/core/constants.ts` files with the new address.
5. Uncommentify the following codes at following locations:
    - `module/sources/RockPaperScissors.move` [`#L103`](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/module/sources/RockPaperScissors.move#L103)
    - `src/pages/Admin.tsx` [`#L22`](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/src/pages/Admin.tsx#L22) [`#L43`](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/src/pages/Admin.tsx#L43)
    - `src/pages/HomePage.tsx` [`#L5`](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/src/pages/HomePage.tsx#L5) [`#L478`](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/src/pages/HomePage.tsx#L478)
    - `src/utils/functions.ts` [`#L14C24`](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/src/utils/functions.ts#L14C24-L14C34) [`#L267`](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/src/utils/functions.ts#L267)
6. *(Optional) Add your keyless account address **with `0x` prefix in ADMINS** in  [`src/core/constants.ts`](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/src/core/constants.ts#L17-L20), and here:* 


[`module/move.toml #L9`](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/module/move.toml#L9)
```toml
newadmin = "<YOUR_ADDRESS_WITHOUT 0x>"
```

[`module/sources/RockPaperScissors.move #L103`](https://github.com/AdNarayan07/Aptos-RockPaperScissors/blob/main/module/sources/RockPaperScissors.move#L103)
```move
assert!( signer_address == @owner || signer_address == @adnarayan || signer_address == @newadmin, 403); // 403 unauthorized access
```

7. Publish the module
```sh
aptos move publish
```

8. Run the frontend again. Now you won't have access to admin page and admin commands (if your account address is not included in admins)

## Video Demos
### Logging in and Playing the Game

https://github.com/user-attachments/assets/040c71f9-f278-4b2d-a361-25f8a2c746c2


### Funding your Wallet from the Faucet

https://github.com/user-attachments/assets/4c0103d8-7144-488d-97ff-7960b1b2e916


### Clearing Site Data (in Chrome)

https://github.com/user-attachments/assets/1424d464-5608-479a-a47f-25ae57aff931


### Admin Page
