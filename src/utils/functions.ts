import {
  Aptos,
  AptosConfig,
  Network,
  InputViewFunctionData,
  KeylessAccount,
  UserTransactionResponse,
} from "@aptos-labs/ts-sdk";
import { Game, EventData } from "./types";
import { MODULE_OWNER } from "../core/constants";

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

const errorMap: { [key: string]: string } = {
  401: "Insufficient funds in Bank",
  402: "Invalid input",
  403: "Unauthorized Access"
};

const errorThrower = (error: unknown) => {
  let errorMessage = (error as object).toString(); // Convert the error to a string

  const errorCodeMatch = errorMessage.match(
    /Move abort.*::RockPaperScissors: (\w+)/
  );

  if (errorCodeMatch?.[1]) {
    const errorCode = parseInt(errorCodeMatch[1]);
    errorMessage = errorMap[errorCode] || errorMessage;
    console.log(errorCode, errorMessage)
    throw new Error(`${errorCode}: ${errorMessage}`);
  } else {
    throw error;
  }
}

export async function fetchBalance(
  activeAccount: KeylessAccount,
  setBalance: (value: number | null) => void
): Promise<void> {
  try {
    setBalance(null);
    const resources: any[] = await aptos.getAccountResources({
      accountAddress: activeAccount.accountAddress,
    });
    const accountResource = resources.find(
      (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
    );

    if (accountResource) {
      const balanceValue = (accountResource.data as any).coin.value;
      setBalance(balanceValue ? parseInt(balanceValue) / 100000000 : 0); // Convert from Octas to APT
    } else {
      setBalance(0);
    }
  } catch (error) {
    console.error("Error fetching balance:", error);
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
        ? parseInt(balance_in_bank_as_string) / 100000000
        : 0
    );
  } catch (error) {
    console.error("Error fetching bank balance:", error);
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
    const amountInOctas = parseFloat(amount) * 100000000 || 0;

    // Generate transaction
    const transaction = await aptos.transaction.build.simple({
      sender: activeAccount.accountAddress,
      data: {
        function: `${MODULE_OWNER}::RockPaperScissors::start_game`,
        functionArguments: [move, amountInOctas, Date.now()],
      },
    });

    const committedTxn = await aptos.signAndSubmitTransaction({
      signer: activeAccount,
      transaction,
    });

    const committedTransactionResponse = await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });

    if (committedTransactionResponse.vm_status == "Executed successfully") {
      // Generate transaction
      const transaction = await aptos.transaction.build.simple({
        sender: activeAccount.accountAddress,
        data: {
          function: `${MODULE_OWNER}::RockPaperScissors::finalize_results`,
          functionArguments: [],
        },
      });

      const committedTxn = await aptos.signAndSubmitTransaction({
        signer: activeAccount,
        transaction,
      });

      const committedTransactionResponse = await aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      if (committedTransactionResponse.vm_status != "Executed successfully") {
        throw new Error(`Error: Some Error Occured! Could not finalize results.`);
      }
    } else {
      throw new Error(`Error: Some Error Occured! Could not start game.`);
    }
  } catch (error) {
    errorThrower(error)
  }
}

export async function withdraw(
  activeAccount: KeylessAccount,
  amount: number | null
) {
  try {
    // Generate transaction
    const transaction = await aptos.transaction.build.simple({
      sender: activeAccount.accountAddress,
      data: {
        function: `${MODULE_OWNER}::RockPaperScissors::withdraw_to_wallet`,
        functionArguments: [amount],
      },
    });

    const committedTxn = await aptos.signAndSubmitTransaction({
      signer: activeAccount,
      transaction,
    });

    const committedTransactionResponse = await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });

    if (committedTransactionResponse.vm_status != "Executed successfully") {
      throw new Error(`Error: Some Error Occured! Could not Withdraw.`);
    }
  } catch (error) {
    errorThrower(error)
  }
}

export async function deposit(
  activeAccount: KeylessAccount,
  amount: number
) {
  try {
    // Generate transaction
    const transaction = await aptos.transaction.build.simple({
      sender: activeAccount.accountAddress,
      data: {
        function: `${MODULE_OWNER}::RockPaperScissors::deposit_to_bank`,
        functionArguments: [amount],
      },
    });

    const committedTxn = await aptos.signAndSubmitTransaction({
      signer: activeAccount,
      transaction,
    });

    const committedTransactionResponse = await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });

    if (committedTransactionResponse.vm_status != "Executed successfully") {
      throw new Error(`Error: Some Error Occured! Could not Deposit.`);
    }
  } catch (error) {
    errorThrower(error)
  }
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

  let results = await aptos.getEvents({
    options: {
      offset: pageNumber * 10,
      limit: 10,
      orderBy: [{ transaction_block_height: "desc" }],
      where: {
        account_address: {
          _eq: "0x0000000000000000000000000000000000000000000000000000000000000000",
        },
        indexed_type: { _eq: `${MODULE_OWNER}::RockPaperScissors::Event` },
      },
    },
  });

  let events: EventData[] = await Promise.all(results.map(async (result) => {
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
  }));
  
  setEvents(events);  

  let nextEntry = await aptos.getEvents({
    options: {
      offset: (pageNumber + 1) * 10,
      limit: 1,
      orderBy: [{ transaction_block_height: "desc" }],
      where: {
        account_address: {
          _eq: "0x0000000000000000000000000000000000000000000000000000000000000000",
        },
        indexed_type: { _eq: `${MODULE_OWNER}::RockPaperScissors::Event` },
      },
    },
  });

  setNoNextPage(!nextEntry.length);
}
