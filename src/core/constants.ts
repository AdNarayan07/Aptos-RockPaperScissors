// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

export const LocalStorageKeys = {
  keylessAccounts: "@aptos-connect/keyless-accounts",
};

export const devnetClient = new Aptos(
  new AptosConfig({ network: Network.DEVNET })
);

/// FIXME: Put your client id here
export const GOOGLE_CLIENT_ID = "296592307220-hp1b3sis2h5hteaa60878t840mbppisu.apps.googleusercontent.com";
export const MODULE_OWNER = "0x947d5d37b8d1498635e23e5bef4f8918967815e563aa428ab829587133b327e4";
export const ADMINS = [
  MODULE_OWNER,
  "0xb432d914d4128c0f554e83ad8d57111b4b2eacbb233b71395d7d23be9a4e4d60",
];
