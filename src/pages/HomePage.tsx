import { FormEventHandler, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useKeylessAccounts } from "../core/useKeylessAccounts";

// import { ADMINS } from "../core/constants";

import { Game } from "../utils/types";
import {
  fetchBalance,
  fetchBankBalance,
  getGames,
  playGame,
} from "../utils/functions";

import RockPaperScissorsAnimation from "../components/rock_paper_scissors_lottie.json";
import loadingAnimation from "../components/loading_lottie.json";
import Lottie from "lottie-react";
import CustomAlert, { AlertType } from "../components/CustomAlert";
import Header from "../components/Header";
import Balances from "../components/Balances";
import { KeylessAccount } from "@aptos-labs/ts-sdk";

const moveMap: { [key: number]: string } = {
  1: "Rock",
  2: "Paper",
  3: "Scissors",
};

function HomePage() {
  const navigate = useNavigate();

  const { activeAccount } = useKeylessAccounts();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [move, setMove] = useState<number>(0);
  const [bankBalance, setBankBalance] = useState<number | undefined>(undefined);
  const [games, setGames] = useState<Game[] | null>(null);
  const [playing, setPlaying] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<AlertType>("info");

  // Utility function to set alert
  const setAlert = (type: AlertType, message: string) => {
    setAlertType(type);
    setAlertMessage(message);
  };

  // Utility function to handle errors and set alerts
  const handleError = (error: any, alert: boolean = false) => {
    if (alert) setAlert(error.type || "error", error.message || String(error)); // Show alert if stated
    console.error(error);
  };

  // Function to fetch and show wallet balance, bank balance
  const fetchData = async (activeAccount: KeylessAccount) => {
    try {
      await Promise.all([
        fetchBalance(activeAccount, setBalance).catch((error) =>
          handleError(error, true)
        ),
        fetchBankBalance(setBankBalance).catch((error) =>
          handleError(error, true)
        )
      ]);
    } catch (error) {
      handleError(error);
    }
  };

  // Fetch the data and game history
  useEffect(() => {
    if (!activeAccount) return navigate("/");
    fetchData(activeAccount);

    getGames(activeAccount)
    .then(((games) => {
      setGames(games) // Set the games
    }))
    .catch((error) => {
      setGames([]); // Set empty array on error
      handleError(error, true);
    })
  }, [activeAccount, navigate]);

  // Handle Play Game Form on Submit
  const handlePlayGame: FormEventHandler = async (e) => {
    e.preventDefault(); // Prevent default behaviour
    if (!activeAccount) return alert("No Active Account!");

    try {
      setPlaying(true);

      await playGame(activeAccount, move, amount).catch((e) => {
        handleError(e, true)
        // Don't let the code execution propagate if there is an error in starting the game
        if(e.origin === "start_game") throw "Start_Game Error";
      });

      await fetchData(activeAccount).catch(handleError); // Refresh the data after game

      // Get the updated games data
      const games = await getGames(activeAccount).catch(handleError);
      setGames(prev => games || prev); // Get the updated games data if not void

      if (games) {
        const recentGame = games[0]; // Get the most recent game (i.e. the game that was just played)

        // Alert the result
        setAlert(
          ...((): [AlertType, string] => {
            switch (recentGame?.result) {
              case 1:
                return ["info", "Game Drawn"];
              case 2:
                return ["success", "You Won"];
              case 3:
                return ["error", "You Lost"];
              default:
                return ["warning", "Result Undeclared"];
            }
          })()
        );
      }
    } catch (e){
      console.log(e) // Log the start_game error
    } finally {
      setPlaying(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden px-4 bg-white dark:bg-gray-900 bg-gray-400 text-black dark:text-white transition-colors h-screen">
      <Header />
      <div className="relative w-full flex flex-1 max-h-[calc(100%-130px)] overflow-auto">
        <div
          className="absolute w-full h-full flex justify-center z-10 backdrop-blur-xl transition-all"
          style={!playing ? { opacity: "0", pointerEvents: "none" } : {}}
        >
          <Lottie
            autoplay
            loop
            animationData={RockPaperScissorsAnimation}
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
        </div>
        {activeAccount ? (
          <div className="w-full flex flex-col lg:flex-row justify-around space-x-2">
            <form
              onSubmit={handlePlayGame}
              className="flex flex-col items-center mt-8 p-2 space-y-4 rounded dark:bg-gray-800 bg-gray-300 lg:overflow-auto"
            >
              <h1 className="text-lg font-bold my-2">Rock Paper Scissors</h1>
              <div className="relative flex items-center justify-between">
                <input
                  type="number"
                  placeholder="Bet APT"
                  value={amount}
                  max={Math.min(balance || 0, bankBalance || 0)}
                  min={0}
                  step={0.01}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-64 p-2 mx-1 border border-gray-700 rounded bg-white dark:bg-gray-800 bg-gray-300 text-black dark:text-white transition-colors"
                />
                <div
                  className="relative mx-1 flex-1 px-3 dark:bg-black/20 bg-white/20 shadow-md rounded text-2xs"
                  style={{ fontSize: "8px" }}
                >
                  <h1 className="w-full rounded-tr rounded-tl bg-white/70 dark:bg-black/70 absolute top-0 left-0 text-center font-bold">
                    Returns
                  </h1>
                  <p className="text-center mt-3 text-xs py-1">
                    Win: 1.8x | Draw: 1x | Lose: 0x
                  </p>
                </div>
              </div>
              <div className="mb-2 flex space-x-4">
                <label
                  className={`w-[7.5rem] flex justify-center cursor-pointer rounded px-4 py-2 border transition-all duration-200 
                    ${
                      move === 1
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-gray-200 text-gray-900 border-gray-300 dark:bg-gray-800 bg-gray-300 dark:text-white border-gray-600"
                    }`}
                >
                  <input
                    type="radio"
                    name="move"
                    value="1"
                    onChange={() => setMove(1)}
                    className="hidden"
                  />
                  Rock
                </label>
                <label
                  className={`w-[7.5rem] flex justify-center cursor-pointer rounded px-4 py-2 border transition-all duration-200 
                    ${
                      move === 2
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-gray-200 text-gray-900 border-gray-300 dark:bg-gray-800 bg-gray-300 dark:text-white border-gray-600"
                    }`}
                >
                  <input
                    type="radio"
                    name="move"
                    value="2"
                    onChange={() => setMove(2)}
                    className="hidden"
                  />
                  Paper
                </label>
                <label
                  className={`w-[7.5rem] flex justify-center cursor-pointer rounded px-4 py-2 border transition-all duration-200 
                    ${
                      move === 3
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-gray-200 text-gray-900 border-gray-300 dark:bg-gray-800 bg-gray-300 dark:text-white border-gray-600"
                    }`}
                >
                  <input
                    type="radio"
                    name="move"
                    value="3"
                    onChange={() => setMove(3)}
                    className="hidden"
                  />
                  Scissors
                </label>
              </div>
              <button
                type="submit"
                disabled={!move}
                className={`px-6 py-2 text-white bg-blue-500 dark:bg-blue-600 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Shoot!
              </button>
              <div className="w-full flex-1 text-gray-800 dark:text-gray-200 mb-4 p-2 rounded dark:bg-gray-900 bg-gray-200 lg:overflow-auto">
                <ol className="ml-6 mt-2 space-y-2">
                  <li>
                    <span>
                      <a
                        href="https://www.aptosfaucet.com/"
                        className="text-cyan-500 hover:underline"
                        target="_blank"
                      >
                        ⚠️ Please Fund your wallet with APT token
                      </a>{" "}
                      if you get <strong>"Account Not Found"</strong> or
                      <strong>"Insufficient Balance"</strong>
                      or <strong>"Faucet Error"</strong>.
                    </span>
                  </li>
                  <li>
                    <span>
                      ⚠️ If you bet the amount which is very close to your
                      current wallet balance, the result declaration might fail
                      and you will get a
                      <strong>"INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE"</strong> error with
                      <strong>"Result Undeclared"</strong> warning, in such case{" "}
                      <a
                        href="https://www.aptosfaucet.com/"
                        className="text-cyan-500 hover:underline"
                        target="_blank"
                      >
                        fund your wallet with APT token
                      </a>{" "}
                      and play a new game. This will declare the previously
                      undeclared game results.
                    </span>
                  </li>
                  <li>
                    <span>
                      ⚠️ If you get <strong>"INVALID_SIGNATURE"</strong> error, clear the site cache
                      and cookies and then relogin.
                    </span>
                  </li>
                  <li>
                    ⚠️ <u>Aptos API Errors and Solutions:</u>
                    <ol className="ml-6 mt-2 space-y-2">
                      <li><strong>404 Transaction Not Found:</strong> Try Later</li>
                      <li><strong>500 Internal Server Error:</strong> Clear Cache and Relogin</li>
                    </ol>
                  </li>
                </ol>
              </div>
            </form>
            <div className="flex flex-col">
              <Balances
                balance={balance}
                setBalance={setBalance}
                bankBalance={bankBalance}
                setBankBalance={setBankBalance}
                activeAccount={activeAccount}
                handleError={handleError}
              />
              <div className="flex-1 overflow-y-auto flex flex-col p-2 mt-4 rounded dark:bg-gray-800 bg-gray-300 lg:w-[26rem] mb-4 lg:mb-0">
                <h2 className="text-lg font-bold mb-2 text-center">
                  Game History
                </h2>
                {games ? (
                  <ul className="space-y-2 w-full text-center">
                    {games.length ? (
                      <>
                        {(() => {
                          const totalProfit = games.reduce((total, e) => {
                            const multiplier =
                              e.result === 1 ? 1 : e.result === 2 ? 1.8 : 0;
                            return (
                              total +
                              (e.bet_amount * (multiplier - 1)) / 100000000
                            );
                          }, 0);

                          return (
                            <>
                              <li className="grid grid-cols-3 gap-2 font-mono">
                                <span className="border-[1px] rounded dark:bg-green-950 bg-green-200 border-green-900 p-2 flex items-center justify-center space-x-2">
                                  <span className="px-3 rounded-md dark:bg-white/10">
                                    Wins
                                  </span>
                                  <span className="px-3 rounded-md bg-white/70 dark:bg-black/70 border border-black dark:border-none">
                                    {games.filter((e) => e.result == 2).length}
                                  </span>
                                </span>
                                <span className="border-[1px] rounded bg-red-200 dark:bg-red-950 border-red-900 p-2 flex items-center justify-center space-x-2">
                                  <span className="px-3 rounded-md dark:bg-white/10">
                                    Loss
                                  </span>
                                  <span className="px-3 rounded-md bg-white/70 dark:bg-black/70 border border-black dark:border-none">
                                    {games.filter((e) => e.result == 3).length}
                                  </span>
                                </span>
                                <span className="border-[1px] rounded bg-gray-200 dark:bg-gray-900 border-gray-700 p-2 flex items-center justify-center space-x-2">
                                  <span className="px-3 rounded-md dark:bg-white/10">
                                    Draw
                                  </span>
                                  <span className="px-3 rounded-md bg-white/70 dark:bg-black/70 border border-black dark:border-none">
                                    {games.filter((e) => e.result == 1).length}
                                  </span>
                                </span>
                              </li>
                              <li
                                className={`p-2 border-[1px] w-full rounded font-mono ${
                                  totalProfit < 0
                                    ? "bg-red-200 dark:bg-red-950 border-red-900"
                                    : totalProfit > 0
                                    ? "bg-green-200 dark:bg-green-950 border-green-900"
                                    : "bg-gray-200 dark:bg-gray-900 border-gray-700"
                                }`}
                              >
                                <span className="px-4 py-1 rounded-md dark:bg-white/10">
                                  Net Gain
                                </span>{" "}
                                <span className="px-4 py-1 rounded-md bg-white/70 dark:bg-black/70 border border-black dark:border-none">
                                  {totalProfit.toFixed(3)} APT
                                </span>
                              </li>
                            </>
                          );
                        })()}
                        {games.map((game, index) => (
                          <li
                            key={index}
                            className={`relative rounded border-[1px] overflow-hidden
                      ${(() => {
                        switch (game.result) {
                          case 2:
                            return "dark:bg-green-950 bg-green-200 border-green-900";
                          case 3:
                            return "dark:bg-red-950 bg-red-200 border-red-900";
                          default:
                            return "dark:bg-gray-900 bg-gray-200 border-gray-700";
                        }
                      })()}`}
                          >
                            <h1 className="w-full rounded-tl-sm rounded-tr-sm px-2 top-0 left-0 bg-black/80 text-xs text-white">
                              {new Date(game?.timestamp * 1).toLocaleString()}
                            </h1>

                            <div
                              className="absolute inset-0 flex justify-center items-center text-6xl font-bold opacity-10"
                              style={{ transform: "rotate(-45deg)" }}
                            >
                              {(() => {
                                switch (game.result) {
                                  case 1:
                                    return "Draw";
                                  case 2:
                                    return "Won";
                                  case 3:
                                    return "Lost";
                                  default:
                                    return "Undeclared";
                                }
                              })()}
                            </div>

                            <div className="grid grid-cols-2 gap-4 m-4">
                              <div className="relative flex-1 p-3 bg-black/20 rounded-lg">
                                <h1 className="w-full rounded-br-lg rounded-bl-lg bg-black/80 absolute bottom-0 left-0 text-xs text-center text-white">
                                  You Played
                                </h1>
                                <p className="text-center mb-3">
                                  {moveMap[game.player_move]}
                                </p>
                              </div>
                              <div className="relative flex-1 p-3 bg-black/20 rounded-lg">
                                <h1 className="w-full rounded-br-lg rounded-bl-lg bg-black/80 absolute bottom-0 left-0 text-xs text-center text-white">
                                  Computer Played
                                </h1>
                                <p className="text-center mb-3">
                                  {moveMap[game.computer_move]}
                                </p>
                              </div>
                              <div className="relative flex-1 p-3 bg-black/20 rounded-lg">
                                <h1 className="w-full rounded-br-lg rounded-bl-lg bg-black/80 absolute bottom-0 left-0 text-xs text-center text-white">
                                  You Bet
                                </h1>
                                <p className="text-center mb-3">
                                  {(game.bet_amount / 100000000).toFixed(3)} APT
                                </p>
                              </div>
                              <div className="relative flex-1 p-3 bg-black/20 rounded-lg">
                                <h1 className="w-full rounded-br-lg rounded-bl-lg bg-black/80 absolute bottom-0 left-0 text-xs text-center text-white">
                                  You Get
                                </h1>
                                <p className="text-center mb-3">
                                  {(
                                    (game.bet_amount *
                                      (() => {
                                        switch (game.result) {
                                          case 1:
                                            return 1;
                                          case 2:
                                            return 1.8;
                                          case 3:
                                            return 0;
                                          default:
                                            return NaN;
                                        }
                                      })()) /
                                    100000000
                                  ).toFixed(3)}{" "}
                                  APT
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </>
                    ) : (
                      "No Game History"
                    )}
                  </ul>
                ) : (
                  <Lottie
                    autoplay
                    loop
                    animationData={loadingAnimation}
                    className="flex-1 h-0 w-full bg-black/30 rounded-lg"
                  />
                )}
              </div>
            </div>
            {
              /*
                The following code is commentified so that anyone can test this function without having to add their address in ADMINS.
              */
              // Show the buttons only to ADMINS
              // ADMINS.includes(activeAccount.accountAddress.toStringLong()) &&
              <button
                className="fixed bottom-4 shadow-lg font-medium right-4 px-4 py-2 rounded dark:bg-gray-950 bg-gray-200 border w-[20ch] transition-all active:scale-[0.8]"
                onClick={() => navigate("/admin")}
              >
                Go To Admin Page
              </button>
            }
          </div>
        ) : null}
      </div>
      {alertMessage && (
        <CustomAlert
          type={alertType}
          message={alertMessage}
          onClose={() => setAlertMessage(null)}
        />
      )}
    </div>
  );
}

export default HomePage;
