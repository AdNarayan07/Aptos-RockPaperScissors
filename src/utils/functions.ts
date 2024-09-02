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
import { MODULE_OWNER } from "../core/constants";

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

const errorMap: { [key: string]: string } = {
  401: "Insufficient funds in Bank",
  402: "Invalid input",
  403: "Unauthorized Access",
};

const errorThrower = (error: unknown) => {
  let errorMessage = (error as object).toString();

  const errorCodeMatch = errorMessage.match(
    /Move abort.*::RockPaperScissors: (\w+)/
  );

  if (errorCodeMatch?.[1]) {
    const errorCode = parseInt(errorCodeMatch[1]);
    errorMessage = errorMap[errorCode] || errorMessage;
    throw `Error: ${errorCode}: ${errorMessage}`;
  } else {
    throw error;
  }
};

async function transaction_signer(
  activeAccount: KeylessAccount,
  data: InputGenerateTransactionPayloadData
): Promise<CommittedTransactionResponse> {
  const transaction = await aptos.transaction.build.simple({
    sender: activeAccount.accountAddress,
    data,
  });

  const committedTxn = await aptos.signAndSubmitTransaction({
    signer: activeAccount,
    transaction,
  });

  return await aptos.waitForTransaction({
    transactionHash: committedTxn.hash,
  });
}

function checkTransactionStatus(response: CommittedTransactionResponse) {
  if (response.vm_status !== "Executed successfully") {
    throw `Error: Some error occurred during the transaction.`;
  }
}

async function fundAccountWithRetry(
  activeAccount: KeylessAccount,
  retryCount: number,
  maxRetries: number,
  reason: string,
  setBalance: (value: number | null) => void,
  fetchBalanceCallback: () => Promise<void>
) {
  console.log("Trying to fund the account. Reason: " + reason);

  await aptos
    .fundAccount({
      accountAddress: activeAccount.accountAddress,
      amount: 100_000_000,
    })
    .catch((e) => console.log(e));

  if (retryCount < maxRetries) {
    await fetchBalanceCallback();
    throw {
      type: "success",
      message: `${reason} Detected: Funded with 1 APT`,
    };
  } else {
    setBalance(0);
    throw {
      type: "error",
      message: `Maximum retry limit of ${maxRetries} reached. Unable to fund ${reason}.`,
    };
  }
}

export async function fetchBalance(
  activeAccount: KeylessAccount,
  setBalance: (value: number | null) => void,
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<void> {
  try {
    setBalance(null);
    const resources: any[] = await aptos.getAccountResources({
      accountAddress: activeAccount.accountAddress,
    });

    const accountResource = resources.find(
      (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
    );

    const balanceValue = (accountResource?.data as any)?.coin?.value;
    let balance = balanceValue ? parseInt(balanceValue) : 0;

    if (balance < 100_000) {
      await fundAccountWithRetry(
        activeAccount,
        retryCount,
        maxRetries,
        "Low Balance",
        setBalance,
        () =>
          fetchBalance(activeAccount, setBalance, retryCount + 1, maxRetries)
      );
    } else {
      setBalance(balance / 100_000_000);
    }
  } catch (error) {
    if (
      error instanceof AptosApiError &&
      error.data?.error_code === "account_not_found"
    ) {
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
      throw error;
    }
  }
}

export async function fetchBankBalance(
  setBankBalance: (value: number | undefined) => void
): Promise<void> {
  try {
    setBankBalance(undefined);
    const payload: InputViewFunctionData = {
      function: `${MODULE_OWNER}::RockPaperScissors::get_bank_balance`,
    };

    const balance_in_bank = (await aptos.view({ payload }))[0];
    const balance_in_bank_as_string = balance_in_bank?.valueOf().toString();

    setBankBalance(
      balance_in_bank_as_string
        ? parseInt(balance_in_bank_as_string) / 100_000_000
        : 0
    );
  } catch (error) {
    throw "Error fetching bank balance: " + error;
  }
}

export async function getGames(activeAccount: KeylessAccount): Promise<Game[]> {
  try {
    const payload: InputViewFunctionData = {
      function: `${MODULE_OWNER}::RockPaperScissors::get_games`,
      functionArguments: [activeAccount.accountAddress],
    };

    const games_value = (await aptos.view({ payload }))[0];
    const games = (games_value?.valueOf() as Game[]) || [];

    return games.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    throw error;
  }
}

export async function playGame(
  activeAccount: KeylessAccount,
  move: number,
  amount: string
): Promise<void> {
  try {
    const amountInOctas = parseFloat(amount) * 100_000_000 || 0;

    const committedTransactionResponse = await transaction_signer(
      activeAccount,
      {
        function: `${MODULE_OWNER}::RockPaperScissors::start_game`,
        functionArguments: [move, amountInOctas, Date.now()],
      }
    );

    checkTransactionStatus(committedTransactionResponse);

    const committedTransactionResponse2 = await transaction_signer(
      activeAccount,
      {
        function: `${MODULE_OWNER}::RockPaperScissors::finalize_results`,
        functionArguments: [],
      }
    );

    checkTransactionStatus(committedTransactionResponse2);
  } catch (error) {
    errorThrower(error);
  }
}

export async function withdraw(
  activeAccount: KeylessAccount,
  amount: number | null
) {
  try {
    const committedTransactionResponse = await transaction_signer(
      activeAccount,
      {
        function: `${MODULE_OWNER}::RockPaperScissors::withdraw_to_wallet`,
        functionArguments: [amount],
      }
    );

    checkTransactionStatus(committedTransactionResponse);
  } catch (error) {
    errorThrower(error);
  }
}

export async function deposit(activeAccount: KeylessAccount, amount: number) {
  try {
    const committedTransactionResponse = await transaction_signer(
      activeAccount,
      {
        function: `${MODULE_OWNER}::RockPaperScissors::deposit_to_bank`,
        functionArguments: [amount],
      }
    );

    checkTransactionStatus(committedTransactionResponse);
  } catch (error) {
    errorThrower(error);
  }
}

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

export async function getEvents(
  setEvents: (value: EventData[] | null) => void,
  setNoNextPage: (value: boolean) => void,
  pageNumber: number
) {
  const typeMap: { [key: number]: "Deposit" | "Withdraw" | "Bet" | "Get" } = {
    1: "Deposit",
    2: "Withdraw",
    3: "Bet",
    4: "Get",
  };

  setEvents(null);
  setNoNextPage(true);

  try {
    let results = await event_getter(10, pageNumber * 10);

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

    setEvents(events);
    let nextEntry = await event_getter(1, (pageNumber + 1) * 10);
    setNoNextPage(!nextEntry.length);
  } catch (error) {
    setEvents([]);
    throw `Error fetching events: ${error}`;
  }
}
