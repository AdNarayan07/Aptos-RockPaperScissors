import {
  Aptos,
  AptosConfig,
  Network,
  InputViewFunctionData,
  KeylessAccount,
  UserTransactionResponse,
  AptosApiError,
  InputGenerateTransactionPayloadData,
  CommittedTransactionResponse,
  GetEventsResponse,
} from "@aptos-labs/ts-sdk";
import { Game, EventData } from "./types";
import { MODULE_OWNER, /*ADMINS*/ } from "../core/constants";

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

// Mapping Error codes to Error Messages
const errorMap: { [key: string]: string } = {
  401: "Insufficient funds in Bank",
  402: "Invalid input",
  403: "Unauthorized Access",
};

// Utility function to throw customised errors
const errorThrower = (error: unknown) => {
  let errorMessage = (error as object).toString();

  // Extract the error code, send by the module, from error string
  const errorCodeMatch = errorMessage.match(
    /Move abort.*::RockPaperScissors: (\w+)/
  );

  // Throw custom error if error code matches, else throw default error
  if (errorCodeMatch?.[1]) {
    const errorCode = parseInt(errorCodeMatch[1]);
    errorMessage = errorMap[errorCode] || errorMessage;
    throw `Error: ${errorCode}: ${errorMessage}`;
  } else {
    throw error;
  }
};

// Utility function to sign a transaction
async function transaction_signer(
  activeAccount: KeylessAccount,
  data: InputGenerateTransactionPayloadData
): Promise<CommittedTransactionResponse> {

  // Build the transaction
  const transaction = await aptos.transaction.build.simple({
    sender: activeAccount.accountAddress,
    data,
  });

  // Sign and submit the transaction
  const committedTxn = await aptos.signAndSubmitTransaction({
    signer: activeAccount,
    transaction,
  });

  // Return committed transaction response
  return await aptos.waitForTransaction({
    transactionHash: committedTxn.hash,
  });
}

// Utility function to check the status of commited transaction response
function checkTransactionStatus(response: CommittedTransactionResponse) {
  if (response.vm_status !== "Executed successfully") {
    throw `Error: Some error occurred during the transaction.`;
  }
}

// Utility function to try and fund account with APT tokens from faucet
async function fundAccountWithRetry(
  activeAccount: KeylessAccount,
  retryCount: number,
  maxRetries: number,
  reason: string,
  setBalance: (value: number | null) => void,
  fetchBalanceCallback: () => Promise<void>
) {
  console.log("Trying to fund the account. Reason: " + reason); // Log the reason for trying to fund account

  // Fund the account and catch error
  await aptos
    .fundAccount({
      accountAddress: activeAccount.accountAddress,
      amount: 100_000_000,
    })
    .catch((e) => {
      /*
        Don't throw this specific error, bcz this occurs everytime I try to fund a new account,
        athough the funding does work, it still gives error and no one in Aptos Server could explain the reason
      */
      if (e.message === "waitForLastSuccessIndexerVersionSync timeout") console.log(e);
      else throw e
    });

  // Run the fetchBalance callback if the retry limit has not reached (which will eventually call this function as well)
  if (retryCount < maxRetries) {
    await fetchBalanceCallback();
    // Throw a success message
    throw {
      type: "success",
      message: `${reason} Detected: Funded with 1 APT`,
    };
  } else {
    // Set the balance to 0 if max retries reached without any success
    setBalance(0);
    // Throw an error message
    throw {
      type: "error",
      message: `Maximum retry limit of ${maxRetries} reached. Unable to fund ${reason}.`,
    };
  }
}

// Function to fetch the balance in user's wallet
export async function fetchBalance(
  activeAccount: KeylessAccount,
  setBalance: (value: number | null) => void,
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<void> {
  try {
    setBalance(null);

    // Get the amount of Aptos Coins
    const resources: any[] = await aptos.getAccountResources({
      accountAddress: activeAccount.accountAddress,
    });

    const accountResource = resources.find(
      (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
    );

    const balanceValue = (accountResource?.data as any)?.coin?.value;

    let balance = balanceValue ? parseInt(balanceValue) : 0; // set the balance if found, or default to 0 if not

    // If the balance is less than 1M Octas, try to fund the account from faucet
    if (balance < 1_000_000) {
      await fundAccountWithRetry(
        activeAccount,
        retryCount,
        maxRetries,
        "Low Balance",
        setBalance,
        () =>
          fetchBalance(activeAccount, setBalance, retryCount + 1, maxRetries) // increase the retry count for next instance of fetchBalance
      );
    } else {
      setBalance(balance / 100_000_000); // Else set the balance, converted from Octas to APT
    }
  } catch (error) {
    if (
      error instanceof AptosApiError &&
      error.data?.error_code === "account_not_found"
    ) {
      // If the account with given address is not found, try to fund from faucet, with retries
      await fundAccountWithRetry(
        activeAccount,
        retryCount,
        maxRetries,
        "New Account",
        setBalance,
        () =>
          fetchBalance(activeAccount, setBalance, retryCount + 1, maxRetries)
      );
    } else {
      throw error; // Throw other errors
    }
  }
}

// Function to fetch the balance in the Game Bank
export async function fetchBankBalance(
  setBankBalance: (value: number | undefined) => void
): Promise<void> {
  try {
    setBankBalance(undefined);

    // Call the view function
    const payload: InputViewFunctionData = {
      function: `${MODULE_OWNER}::RockPaperScissors::get_bank_balance`,
    };

    const balance_in_bank = (await aptos.view({ payload }))[0];
    const balance_in_bank_as_string = balance_in_bank?.valueOf().toString();

    setBankBalance(
      balance_in_bank_as_string
        ? parseInt(balance_in_bank_as_string) / 100_000_000 // Convert Octas to APT
        : 0
    );
  } catch (error) {
    throw "Error fetching bank balance: " + error;
  }
}

// Function to view the games history of user
export async function getGames(activeAccount: KeylessAccount): Promise<Game[]> {
  try {

    // Call the view function
    const payload: InputViewFunctionData = {
      function: `${MODULE_OWNER}::RockPaperScissors::get_games`,
      functionArguments: [activeAccount.accountAddress],
    };

    const games_value = (await aptos.view({ payload }))[0];
    const games = (games_value?.valueOf() as Game[]) || [];

    return games.sort((a, b) => b.timestamp - a.timestamp); // Return the games ordered in reverse chronological order
  } catch (error) {
    throw error;
  }
}

// Function to play the game
export async function playGame(
  activeAccount: KeylessAccount,
  move: number,
  amount: string
): Promise<void> {
  try {
    const amountInOctas = parseFloat(amount) * 100_000_000 || 0; // Parse the input amount

    // Sign the transaction for start_game function
    const committedTransactionResponse = await transaction_signer(
      activeAccount,
      {
        function: `${MODULE_OWNER}::RockPaperScissors::start_game`,
        functionArguments: [move, amountInOctas, Date.now()],
      }
    ).catch((error) => { throw {origin: "start_game", message: String(error)}}); // Throw the error along with the error origin

    checkTransactionStatus(committedTransactionResponse); // Check transaction status

    // Sign the transaction for finalize_results function
    const committedTransactionResponse2 = await transaction_signer(
      activeAccount,
      {
        function: `${MODULE_OWNER}::RockPaperScissors::finalize_results`,
        functionArguments: [],
      }
    ).catch((error) => { throw {origin: "finalize_results", message: String(error)}}); // Throw the error along with the error origin

    checkTransactionStatus(committedTransactionResponse2); // Again check transaction status
  } catch (error) {
    errorThrower(error);
  }
}

// Function to withdraw the coins from Game Bank to User Wallet, should be accessible only to Admins
export async function withdraw(
  activeAccount: KeylessAccount,
  amount: number | null
) {

  /*
    The following code is commentified so that anyone can test this function without having to add their address in ADMINS.
  */

  // if (!ADMINS.includes(activeAccount.accountAddress.toStringLong())) throw `UNAUTHORIZED: You can't withdraw from bank!`

  try {
    // Sign the withdraw_to_wallet transaction
    const committedTransactionResponse = await transaction_signer(
      activeAccount,
      {
        function: `${MODULE_OWNER}::RockPaperScissors::withdraw_to_wallet`,
        functionArguments: [amount],
      }
    );

    checkTransactionStatus(committedTransactionResponse); // Check status
  } catch (error) {
    errorThrower(error);
  }
}

// Function to deposit the coins to bank
export async function deposit(activeAccount: KeylessAccount, amount: number | null) {
  try {
    if (!amount) throw `402: Invalid Input`
    // Sign the withdraw_to_wallet transaction
    const committedTransactionResponse = await transaction_signer(
      activeAccount,
      {
        function: `${MODULE_OWNER}::RockPaperScissors::deposit_to_bank`,
        functionArguments: [amount],
      }
    );

    checkTransactionStatus(committedTransactionResponse); // Check status
  } catch (error) {
    errorThrower(error);
  }
}

// Utility function to get the events fired from the module
async function event_getter(
  limit: number,
  offset: number
): Promise<GetEventsResponse> {
  return await aptos.getEvents({
    options: {
      offset,
      limit,
      orderBy: [{ transaction_block_height: "desc" }],
      where: {
        account_address: {
          _eq: "0x0000000000000000000000000000000000000000000000000000000000000000",
        },
        indexed_type: { _eq: `${MODULE_OWNER}::RockPaperScissors::Event` },
      },
    },
  });
}

// Function to get the list of events data
export async function getEvents(
  setEvents: (value: EventData[] | null) => void,
  setNoNextPage: (value: boolean) => void,
  pageNumber: number
) {

  // Mapping the type id to readable form
  const typeMap: { [key: number]: "Deposit" | "Withdraw" | "Bet" | "Get" } = {
    1: "Deposit",
    2: "Withdraw",
    3: "Bet",
    4: "Get",
  };

  setEvents(null);
  setNoNextPage(true);

  try {
    let results = await event_getter(10, pageNumber * 10); // Get 10 events of the current page

    // Get transaction hash and timestamp of the event from version
    let events: EventData[] = await Promise.all(
      results.map(async (result) => {
        const { caller, type, amount } = result.data;

        const transaction = (await aptos.getTransactionByVersion({
          ledgerVersion: result.transaction_version,
        })) as UserTransactionResponse;

        return {
          caller,
          type: typeMap[type],
          amount,
          tx_hash: transaction.hash,
          timestamp: parseInt(transaction.timestamp) / 1000,
        };
      })
    );

    setEvents(events); // Set the events

    // Check if there are more events on next page or not
    let nextEntry = await event_getter(1, (pageNumber + 1) * 10);
    setNoNextPage(!nextEntry.length);
  } catch (error) {
    setEvents([]);
    throw `Error fetching events: ${error}`;
  }
}
