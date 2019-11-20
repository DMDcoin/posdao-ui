/* Generated by ts-generator ver. 0.0.8 */
/* tslint:disable */

import BN from "bn.js";
import Contract, { contractOptions } from "web3/eth/contract";
import { EventLog, Callback, EventEmitter } from "web3/types";
import { TransactionObject, BlockType } from "web3/eth/types";
import { ContractEvent } from "./types";

interface EventOptions {
  filter?: object;
  fromBlock?: BlockType;
  topics?: string[];
}

export class BaseAdminUpgradeabilityProxy extends Contract {
  constructor(
    jsonInterface: any[],
    address?: string,
    options?: contractOptions
  );
  clone(): BaseAdminUpgradeabilityProxy;
  methods: {
    admin(): TransactionObject<string>;

    implementation(): TransactionObject<string>;

    changeAdmin(newAdmin: string): TransactionObject<void>;

    upgradeTo(newImplementation: string): TransactionObject<void>;

    upgradeToAndCall(
      newImplementation: string,
      data: string | number[]
    ): TransactionObject<void>;
  };
  events: {
    AdminChanged: ContractEvent<{
      previousAdmin: string;
      newAdmin: string;
      0: string;
      1: string;
    }>;
    Upgraded: ContractEvent<string>;
    allEvents: (
      options?: EventOptions,
      cb?: Callback<EventLog>
    ) => EventEmitter;
  };
}