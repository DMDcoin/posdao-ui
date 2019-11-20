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

export class BlockRewardAuRaCoins extends Contract {
  constructor(
    jsonInterface: any[],
    address?: string,
    options?: contractOptions
  );
  clone(): BlockRewardAuRaCoins;
  methods: {
    snapshotPoolValidatorStakeAmount(
      arg0: number | string,
      arg1: string
    ): TransactionObject<BN>;

    setErcToNativeBridgesAllowed(
      _bridgesAllowed: (string)[]
    ): TransactionObject<void>;

    blockRewardContractId(): TransactionObject<string>;

    mintedForAccountInBlock(
      arg0: string,
      arg1: number | string
    ): TransactionObject<BN>;

    epochPoolNativeReward(
      arg0: number | string,
      arg1: string
    ): TransactionObject<BN>;

    isInitialized(): TransactionObject<boolean>;

    mintedForAccount(arg0: string): TransactionObject<BN>;

    ercToNativeBridgesAllowed(): TransactionObject<(string)[]>;

    mintedInBlock(arg0: number | string): TransactionObject<BN>;

    epochsToClaimRewardFrom(
      _poolStakingAddress: string,
      _staker: string
    ): TransactionObject<(BN)[]>;

    validatorRewardPercent(_stakingAddress: string): TransactionObject<BN>;

    addBridgeNativeFeeReceivers(
      _amount: number | string
    ): TransactionObject<void>;

    mintedTotally(): TransactionObject<BN>;

    delegatorShare(
      _stakingEpoch: number | string,
      _delegatorStaked: number | string,
      _validatorStaked: number | string,
      _totalStaked: number | string,
      _poolReward: number | string
    ): TransactionObject<BN>;

    snapshotPoolTotalStakeAmount(
      arg0: number | string,
      arg1: string
    ): TransactionObject<BN>;

    validatorShare(
      _stakingEpoch: number | string,
      _validatorStaked: number | string,
      _totalStaked: number | string,
      _poolReward: number | string
    ): TransactionObject<BN>;

    onTokenTransfer(
      arg0: string,
      arg1: number | string,
      arg2: string | number[]
    ): TransactionObject<boolean>;

    extraReceiversQueueSize(): TransactionObject<BN>;

    addExtraReceiver(
      _amount: number | string,
      _receiver: string
    ): TransactionObject<void>;

    nativeRewardUndistributed(): TransactionObject<BN>;

    mintedTotallyByBridge(arg0: string): TransactionObject<BN>;

    initialize(_validatorSet: string): TransactionObject<void>;

    clearBlocksCreated(): TransactionObject<void>;

    validatorMinRewardPercent(arg0: number | string): TransactionObject<BN>;

    epochsPoolGotRewardFor(_miningAddress: string): TransactionObject<(BN)[]>;

    validatorSetContract(): TransactionObject<string>;

    bridgeNativeFee(): TransactionObject<BN>;

    blocksCreated(arg0: number | string, arg1: string): TransactionObject<BN>;

    reward(
      benefactors: (string)[],
      kind: (number | string)[]
    ): TransactionObject<{
      receiversNative: (string)[];
      rewardsNative: (BN)[];
      0: (string)[];
      1: (BN)[];
    }>;

    migrateMintingStatistics(
      _bridge: string,
      _prevBlockRewardContract: string
    ): TransactionObject<void>;

    transferReward(
      _nativeCoins: number | string,
      _to: string
    ): TransactionObject<void>;

    getDelegatorReward(
      _delegatorStake: number | string,
      _stakingEpoch: number | string,
      _poolMiningAddress: string
    ): TransactionObject<BN>;

    getValidatorReward(
      _stakingEpoch: number | string,
      _poolMiningAddress: string
    ): TransactionObject<BN>;
  };
  events: {
    AddedReceiver: ContractEvent<{
      amount: BN;
      receiver: string;
      bridge: string;
      0: BN;
      1: string;
      2: string;
    }>;
    BridgeNativeFeeAdded: ContractEvent<{
      amount: BN;
      cumulativeAmount: BN;
      bridge: string;
      0: BN;
      1: BN;
      2: string;
    }>;
    MintedNative: ContractEvent<{
      receivers: (string)[];
      rewards: (BN)[];
      0: (string)[];
      1: (BN)[];
    }>;
    allEvents: (
      options?: EventOptions,
      cb?: Callback<EventLog>
    ) => EventEmitter;
  };
}
