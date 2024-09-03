import Header from "../components/Header";
import Balances from "../components/Balances";
import CustomAlert, { AlertType } from "../components/CustomAlert";
import Lottie from "lottie-react";
import transactionAnimation from "../components/transaction_lottie.json";
import loadingAnimation from "../components/loading_lottie.json";
import { Tooltip } from "react-tooltip";

import { useKeylessAccounts } from "../core/useKeylessAccounts";
import { useState, useEffect, FormEventHandler } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchBalance,
  fetchBankBalance,
  getEvents,
  withdraw,
  deposit,
} from "../utils/functions";
import { EventData } from "../utils/types";
import { KeylessAccount } from "@aptos-labs/ts-sdk";

// import { ADMINS } from "../core/constants";

function AdminPage() {
  const navigate = useNavigate();
  const { activeAccount } = useKeylessAccounts();
  const [balance, setBalance] = useState<number | null>(null);
  const [bankBalance, setBankBalance] = useState<number | undefined>(undefined);
  const [events, setEvents] = useState<EventData[] | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [noNextPage, setNoNextPage] = useState<boolean>(true);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<AlertType>("info");
  const [transacting, setTransacting] = useState<boolean>(false);

  useEffect(() => {
    if (!activeAccount) {
      navigate("/");
    } else {
      /*
        The following code is commentified so that anyone can test this function without having to add their address in ADMINS.
      */
      // if (!ADMINS.includes(activeAccount.accountAddress.toStringLong())) navigate("/home")

      // fetch wallet and bank balance
      fetchBalanceAndHandleError(activeAccount, setBalance); 
      fetchBankBalance(setBankBalance);
    }
  }, [activeAccount, navigate]);

  // Fetch 10 events of current page
  useEffect(() => {
    fetchEventsAndHandleError(currentPage);
  }, [currentPage]);

  // Utility function to set both alert type and message
  const setAlert = (type: AlertType, message: string) => {
    setAlertType(type);
    setAlertMessage(message);
  };

  // Utility function to handle errors and set alerts
  const handleError = (error: any, alert: boolean = false) => {
    if (alert) setAlert(error.type || "error", error.message || String(error));
    console.error(error);
  };

  // Function to handle balance fetching with error handling
  const fetchBalanceAndHandleError = async (
    account: KeylessAccount,
    setBalance: (value: number | null) => void
  ) => {
    try {
      await fetchBalance(account, setBalance);
    } catch (error: any) {
      handleError(error, true);
    }
  };

  // Function to handle events fetching with error handling
  const fetchEventsAndHandleError = async (pageNumber: number) => {
    try {
      await getEvents(setEvents, setNoNextPage, pageNumber);
    } catch (error: any) {
      handleError(error, true);
    }
  };

  // Generic transaction handler (Withdraw or Deposit)
  const handleTransaction = async (
    action: () => Promise<void>,
    successMessage: string
  ) => {
    setTransacting(true);
    try {
      await action(); // call transaction action 

      setAlert("success", successMessage); // alert the user

      // Fetch updated balance and events data
      if (activeAccount) await fetchBalanceAndHandleError(activeAccount, setBalance);
      fetchBankBalance(setBankBalance);
      fetchEventsAndHandleError(0);
    } catch (error: any) {
      handleError(error, true);
    } finally {
      setTransacting(false);
    }
  };

  // Generic form handler for deposit and withdraw actions
  const handleFormEvent = (
    event: React.FormEvent<Element>,
    transactionFn: (_a: KeylessAccount, _b: number) => Promise<void>,
    successMessage: string
  ) => {
    event.preventDefault(); // prevent default action

    // Get the amount
    const formdata = new FormData(event.currentTarget as HTMLFormElement);
    const amount = formdata.get("amount") as string | null;

    // Handle the transaction
    if (activeAccount && amount) {
      handleTransaction(
        () => transactionFn(activeAccount, parseFloat(amount) * 100000000),
        successMessage
      );
    } else {
      setAlert("error", "No active account or Invalid Amount");
    }
  };

  // Event Handlers for Withdraw and Deposit forms
  const depositEventHandler: FormEventHandler = (e) => {
    handleFormEvent(e, deposit, "Coins Deposited to the Bank!");
  };

  const withdrawEventHandler: FormEventHandler = (e) => {
    handleFormEvent(e, withdraw, "Withdrawal Successful");
  };

  return (
    <div className="flex flex-col overflow-scroll px-4 bg-white dark:bg-gray-900 bg-gray-400 text-black dark:text-white transition-colors h-screen">
      <Header />

      {activeAccount && (
        <div className="w-full flex flex-col items-center space-y-4 p-4 dark:bg-gray-900 dark:text-white">
          <div className="flex flex-col md:flex-row justify-between w-full md:space-x-4">
            <div className="space-y-2 w-full mt-8 relative">
              <form
                onSubmit={depositEventHandler}
                className="w-full max-w-4xl p-4 bg-white dark:bg-gray-800 rounded shadow-md"
              >
                <h2 className="text-lg font-semibold mb-2 text-center">
                  Deposit in Game Bank
                </h2>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder="Enter deposit amount"
                    max={balance || 0}
                    min={0}
                    step={0.001}
                    name="amount"
                    required
                    className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                  />
                  <input
                    type="submit"
                    value="Deposit"
                    className="px-4 w-32 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer"
                  />
                </div>
              </form>
              <form
                onSubmit={withdrawEventHandler}
                className="w-full max-w-4xl p-4 bg-white dark:bg-gray-800 rounded shadow-md"
              >
                <h2 className="text-lg font-semibold mb-2 text-center">
                  Withdraw from Game Bank
                </h2>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder="Enter withdrawal amount (optional: defaults to All)"
                    max={bankBalance || 0}
                    min={0}
                    step={0.001}
                    name="amount"
                    className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                  />
                  <input
                    type="submit"
                    value="Withdraw"
                    max={bankBalance || 0}
                    min={0}
                    className="px-4 w-32 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 cursor-pointer"
                  />
                </div>
              </form>
              {transacting && (
                <Lottie
                  autoplay
                  loop
                  animationData={transactionAnimation}
                  style={{
                    height: "100%",
                    width: "100%",
                    position: "absolute",
                    top: "0",
                    left: "0",
                    margin: "0",
                    backdropFilter: "blur(20px)",
                    backgroundColor: "#0005",
                  }}
                />
              )}
            </div>
            <Balances
              balance={balance}
              setBalance={setBalance}
              bankBalance={bankBalance}
              setBankBalance={setBankBalance}
              activeAccount={activeAccount}
              handleError={handleError}
            />
          </div>
          <div className="flex-1 w-full max-w-5xl overflow-y-auto flex flex-col p-2 mt-4 rounded dark:bg-gray-800 bg-gray-300">
            <h2 className="text-lg font-bold mb-2 text-center flex justify-between">
              <button
                data-tooltip-place="bottom"
                data-tooltip-id="page"
                data-tooltip-content="Previous Page"
                data-tooltip-offset={0}
                className="rotate-180 ml-4 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.7] transition-all text-xl"
                disabled={!currentPage}
                onClick={() => setCurrentPage(Math.max(currentPage - 1, 0))}
              >
                🡆
              </button>
              <span className="flex items-center">
                Bank Statement{" "}
                <a
                  data-tooltip-place="bottom"
                  data-tooltip-id="refresh-statement"
                  data-tooltip-content="Refresh Statement"
                  href="#"
                  onClick={(e) => {
                    const targetElement = e.currentTarget;
                    const currentRotation =
                      parseInt(targetElement.style.rotate) || 0;
                    e.currentTarget.style.rotate = `${
                      currentRotation + 360
                    }deg`;
                    getEvents(setEvents, setNoNextPage, 0);
                  }}
                  className="text-blue-600 ml-2 dark:text-blue-400 hover:underline font-semibold text-2xl w-9 h-9 text-center rounded-full dark:hover:bg-gray-950 hover:outline outline-1 transition-all duration-300"
                  style={{ textDecoration: "none" }}
                >
                  ↻
                </a>
              </span>
              <button
                data-tooltip-place="bottom"
                data-tooltip-id="page"
                data-tooltip-content="Next Page"
                data-tooltip-offset={0}
                className="mr-4 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.7] transition-all text-xl"
                disabled={noNextPage}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                🡆
              </button>
            </h2>
            <ul className="space-y-2 w-full text-center flex flex-col items-center relative">
              {events ? (
                events.length ? (
                  events.map((event, index) => (
                    <a
                      key={event.tx_hash}
                      href={`https://explorer.aptoslabs.com/txn/${event.tx_hash}?network=testnet`}
                      target="_blank"
                      className="w-[inherit]"
                    >
                      <li
                        key={index}
                        className={`relative rounded border-[1px] overflow-hidden mt-2 
                      ${(() => {
                        switch (event.type) {
                          case "Deposit":
                          case "Bet":
                            return "dark:bg-green-950 bg-green-200 border-green-700 text-green-400";

                          case "Withdraw":
                          case "Get":
                            return "dark:bg-red-950 bg-red-200 border-red-700 text-red-300";

                          default:
                            return "dark:bg-gray-900 bg-gray-200 border-gray-700 text-gray-400";
                        }
                      })()}`}
                      >
                        <h1 className="w-full rounded-tl-sm rounded-tr-sm px-2 top-0 left-0 dark:bg-black/80 bg-black/10 text-xs dark:text-white text-black">
                          {new Date(event?.timestamp * 1).toLocaleString()}
                        </h1>
                        <div className="p-4 rounded-lg border-[inherit] shadow-md space-y-2 md:space-y-0 md:space-x-2 flex items-center md:flex-row flex-col">
                          <div className="text-sm border border-[inherit] px-4 py-0.5 w-[15ch] rounded-full dark:bg-black/60 bg-white/30 text-black dark:text-[inherit]">
                            {event.type}
                          </div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate w-[-webkit-fill-available]">
                            {event.caller}
                          </div>
                          <div className="text-sm text-gray-900 dark:text-gray-300 w-[15ch] dark:bg-gray-950/70 bg-gray-100/70 font-medium outline outline-1 rounded p-1">
                            {(event.amount / 100000000).toFixed(3)} APT
                          </div>
                        </div>
                      </li>
                    </a>
                  ))
                ) : (
                  "No Transactions in Bank"
                )
              ) : (
                <Lottie
                  autoplay
                  loop
                  animationData={loadingAnimation}
                  style={{
                    height: "100px",
                    width: "100%",
                    backgroundColor: "#0005",
                    borderRadius: "10px",
                  }}
                />
              )}
            </ul>
          </div>
          <div></div>
        </div>
      )}
      {alertMessage && (
        <CustomAlert
          type={alertType}
          message={alertMessage}
          onClose={() => setAlertMessage(null)}
        />
      )}
      <Tooltip id="page" />
      <Tooltip id="refresh-statement" />
      <button
        className="fixed bottom-4 shadow-lg font-medium right-4 px-4 py-2 rounded dark:bg-gray-950 bg-gray-200 border w-[20ch] transition-all active:scale-[0.8]"
        onClick={() => navigate("/home")}
      >
        Go To Home Page
      </button>
    </div>
  );
}

export default AdminPage;
