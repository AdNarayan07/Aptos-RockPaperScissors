import { useState, useEffect } from "react";
import GoogleLogo from "../components/GoogleLogo";
import WalletLogo from "../components/WalletLogo";
import { collapseAddress } from "../core/utils";
import { jwtDecode } from "jwt-decode";
import { Profile } from "../utils/types";
import { useKeylessAccounts } from "../core/useKeylessAccounts";
import { Tooltip } from "react-tooltip";

function Header(props: {page: "home" | "admin"}) {
  const { page } = props;
  const { activeAccount, disconnectKeylessAccount } = useKeylessAccounts();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (activeAccount) {
        let { name, email, picture } = jwtDecode(activeAccount.jwt) as Profile;
        setProfile({ name, email, picture });
    }
  }, [activeAccount]);
  
  return (
    <div className="w-full mt-5 flex justify-between items-center z-10">
      <h1 className="text-2xl font-bold mb-2 flex items-center w-[26rem]">
        <img src={profile?.picture} className="mr-3 rounded w-20 h-20" />
        <p>
          Welcome to Aptos,
          <br />
          <span className="text-4xl">{profile?.name}!</span>
        </p>
      </h1>
      {page === "admin" && <h1 className="text-2xl font-bold">Admin Controls</h1>}
      {activeAccount ? (
        <div className="flex flex-col w-[26rem] items-end">
          <button
            data-tooltip-id="logout" data-tooltip-content="Log Out!" data-tooltip-place="bottom"
            className="ml-5 mb-3 w-fit font-mono flex justify-center items-center border border-red-300 dark:border-red-950 rounded-lg px-8 py-2 shadow-sm cursor-pointer bg-red-100 dark:bg-red-900 transition-colors"
            onClick={() => {
              let _confirm = confirm("Log out?");
              if (_confirm) disconnectKeylessAccount();
            }}
          >
            <GoogleLogo />
            {collapseAddress(
              profile?.email || activeAccount?.accountAddress.toString()
            )}
          </button>
          <button
            data-tooltip-id="copy-address" data-tooltip-content="Click to Copy!" data-tooltip-place="bottom"
            className="ml-5 font-mono w-fit flex justify-center items-center border border-gray-300 dark:border-gray-700 rounded-lg px-8 py-2 shadow-sm cursor-copy bg-gray-50 dark:bg-gray-800 bg-gray-300 transition-colors disabled:cursor-not-allowed"
            onClick={async (e) => {
              const element = e.currentTarget;
              const prevData = element.innerHTML;
              element.innerText = "Copied";
              element.disabled = true;
              await navigator.clipboard?.writeText(
                activeAccount?.accountAddress.toString()
              );
              setTimeout(() => {
                element.innerHTML = prevData;
                element.disabled = false;
              }, 1000);
            }}
          >
            <WalletLogo />
            {collapseAddress(activeAccount?.accountAddress.toString())}
          </button>
        </div>
      ) : (
        <p className="ml-5 font-mono flex justify-center items-center border border-gray-300 dark:border-gray-700 rounded-lg px-8 py-2 shadow-sm cursor-not-allowed bg-gray-50 dark:bg-gray-800 transition-colors">
          Not logged in
        </p>
      )}
    <Tooltip id="logout" />
    <Tooltip id="copy-address" />
    </div>
  );
}

export default Header;
