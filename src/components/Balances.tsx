import { KeylessAccount } from "@aptos-labs/ts-sdk";
import { fetchBankBalance } from "../utils/functions";
import { fetchBalance } from "../utils/functions";
import AptosLogo from "./AptosLogo";
import Lottie from "lottie-react";
import loadingAnimation from "./loading_lottie.json"
import { Tooltip } from "react-tooltip";

interface BalancesProps {
  balance: number | null;
  setBalance: (value: number | null) => void;
  bankBalance: number | undefined;
  setBankBalance: (value: number | undefined) => void;
  activeAccount: KeylessAccount;
}

const Balances: React.FC<BalancesProps> = ({
  balance,
  setBalance,
  bankBalance,
  setBankBalance,
  activeAccount,
}) => {

  const Loading = 
  <Lottie
    autoplay
    loop
    animationData={loadingAnimation}
    className="flex justify-center mx-2 overflow-hidden [&>svg]:!scale-[1.3] dark:bg-gray-900 bg-gray-200 outline outline-1 rounded w-[15ch] h-10"
  />


  return (
    <div className="space-y-4 mt-8 p-4 rounded dark:bg-gray-800 flex flex-col items-center shadow-md">
      <h1 className="text-lg font-bold mb-2 text-center">Balances</h1>
      <div className="flex w-fit justify-between items-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 bg-gray-300 shadow-sm">
        <span className="font-medium text-gray-700 dark:text-gray-200 flex items-center">
          <span className="w-24">User Wallet</span>
          {balance !== null ? <span className="flex justify-center items-center px-5 py-1 mx-2 dark:bg-gray-900 bg-gray-200 outline outline-1 rounded w-[15ch] h-10">
          {`${(Math.floor(balance * 1000) / 1000).toFixed(3)}`} <AptosLogo />
          </span> : Loading}
        </span>
        <a
          href="#"
          data-tooltip-place="bottom" data-tooltip-id="refresh-balance" data-tooltip-content="Refresh Balance" data-tooltip-offset={-10}
          onClick={(e) => {
            const targetElement = e.currentTarget;
            const currentRotation = parseInt(targetElement.style.rotate) || 0;
            e.currentTarget.style.rotate = `${currentRotation + 360}deg`;
            fetchBalance(activeAccount, setBalance);
          }}
          className="text-blue-600 ml-2 dark:text-blue-400 hover:underline font-semibold text-2xl w-9 h-9 text-center rounded-full dark:hover:bg-gray-950 hover:outline outline-1 transition-all duration-300"
          style={{ textDecoration: "none" }}
        >
          ↻
        </a>
      </div>
      <div className="flex w-fit justify-between items-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 bg-gray-300 shadow-sm">
        <span className="font-medium text-gray-700 dark:text-gray-200 flex items-center">
          <span className="w-24">Game Bank</span>
          {bankBalance !== undefined ? <span className="flex justify-center items-center px-5 py-1 mx-2 dark:bg-gray-900 bg-gray-200 outline outline-1 rounded w-[15ch] h-10">
          {`${(Math.floor(bankBalance * 1000) / 1000).toFixed(3)}`} <AptosLogo />
          </span> : Loading}
        </span>
        <a
          href="#"
          data-tooltip-place="bottom" data-tooltip-id="refresh-balance" data-tooltip-content="Refresh Balance" data-tooltip-offset={-10}
          onClick={(e) => {
            const targetElement = e.currentTarget;
            const currentRotation = parseInt(targetElement.style.rotate) || 0;
            e.currentTarget.style.rotate = `${currentRotation + 360}deg`;
            fetchBankBalance(setBankBalance);
          }}
          className="text-blue-600 ml-2 dark:text-blue-400 hover:underline font-semibold text-2xl w-9 h-9 text-center rounded-full dark:hover:bg-gray-950 hover:outline outline-1 transition-all duration-300"
          style={{ textDecoration: "none" }}
        >
          ↻
        </a>
      </div>
      <Tooltip id="refresh-balance"/>
    </div>
  );
};

export default Balances;
