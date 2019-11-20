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

export class ValidatorSetHbbft extends Contract {
  constructor(
    jsonInterface: any[],
    address?: string,
    options?: contractOptions
  );
  clone(): ValidatorSetHbbft;
  methods: {
    miningByStakingAddress(arg0: string): TransactionObject<string>;

    blockRewardContract(): TransactionObject<string>;

    unremovableValidator(): TransactionObject<string>;

    MAX_VALIDATORS(): TransactionObject<BN>;

    isValidatorPrevious(arg0: string): TransactionObject<boolean>;

    validatorCounter(arg0: string): TransactionObject<BN>;

    validatorSetApplyBlock(): TransactionObject<BN>;

    randomContract(): TransactionObject<string>;

    changeRequestCount(): TransactionObject<BN>;

    stakingContract(): TransactionObject<string>;

    isValidator(arg0: string): TransactionObject<boolean>;

    finalizeChange(): TransactionObject<void>;

    initialize(
      _blockRewardContract: string,
      _randomContract: string,
      _stakingContract: string,
      _initialMiningAddresses: (string)[],
      _initialStakingAddresses: (string)[],
      _firstValidatorIsUnremovable: boolean
    ): TransactionObject<void>;

    newValidatorSet(): TransactionObject<void>;

    getPreviousValidators(): TransactionObject<(string)[]>;

    getPendingValidators(): TransactionObject<(string)[]>;

    getValidators(): TransactionObject<(string)[]>;

    isInitialized(): TransactionObject<boolean>;

    validatorsToBeFinalized(): TransactionObject<{
      miningAddresses: (string)[];
      forNewEpoch: boolean;
      0: (string)[];
      1: boolean;
    }>;
  };
  events: {
    allEvents: (
      options?: EventOptions,
      cb?: Callback<EventLog>
    ) => EventEmitter;
  };
}