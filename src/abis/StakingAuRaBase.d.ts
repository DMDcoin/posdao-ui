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

export class StakingAuRaBase extends Contract {
  constructor(
    jsonInterface: any[],
    address?: string,
    options?: contractOptions
  );
  clone(): StakingAuRaBase;
  methods: {
    delegatorStakeSnapshot(
      arg0: string,
      arg1: string,
      arg2: number | string
    ): TransactionObject<BN>;

    poolDelegatorIndex(arg0: string, arg1: string): TransactionObject<BN>;

    rewardWasTaken(
      arg0: string,
      arg1: string,
      arg2: number | string
    ): TransactionObject<boolean>;

    stakeAmountTotal(arg0: string): TransactionObject<BN>;

    stakeFirstEpoch(arg0: string, arg1: string): TransactionObject<BN>;

    candidateMinStake(): TransactionObject<BN>;

    poolInactiveIndex(arg0: string): TransactionObject<BN>;

    stakingEpochStartBlock(): TransactionObject<BN>;

    stakingEpoch(): TransactionObject<BN>;

    poolDelegatorInactiveIndex(
      arg0: string,
      arg1: string
    ): TransactionObject<BN>;

    stakeWithdrawDisallowPeriod(): TransactionObject<BN>;

    orderWithdrawEpoch(arg0: string, arg1: string): TransactionObject<BN>;

    stakeAmount(arg0: string, arg1: string): TransactionObject<BN>;

    poolIndex(arg0: string): TransactionObject<BN>;

    stakeLastEpoch(arg0: string, arg1: string): TransactionObject<BN>;

    stakingEpochDuration(): TransactionObject<BN>;

    delegatorMinStake(): TransactionObject<BN>;

    orderedWithdrawAmountTotal(arg0: string): TransactionObject<BN>;

    validatorSetContract(): TransactionObject<string>;

    orderedWithdrawAmount(arg0: string, arg1: string): TransactionObject<BN>;

    poolToBeRemovedIndex(arg0: string): TransactionObject<BN>;

    MAX_CANDIDATES(): TransactionObject<BN>;

    poolToBeElectedIndex(arg0: string): TransactionObject<BN>;

    addPool(
      _amount: number | string,
      _miningAddress: string
    ): TransactionObject<void>;

    clearUnremovableValidator(
      _unremovableStakingAddress: string
    ): TransactionObject<void>;

    incrementStakingEpoch(): TransactionObject<void>;

    initialize(
      _validatorSetContract: string,
      _initialStakingAddresses: (string)[],
      _delegatorMinStake: number | string,
      _candidateMinStake: number | string,
      _stakingEpochDuration: number | string,
      _stakingEpochStartBlock: number | string,
      _stakeWithdrawDisallowPeriod: number | string
    ): TransactionObject<void>;

    removePool(_stakingAddress: string): TransactionObject<void>;

    removePools(): TransactionObject<void>;

    removeMyPool(): TransactionObject<void>;

    setStakingEpochStartBlock(
      _blockNumber: number | string
    ): TransactionObject<void>;

    moveStake(
      _fromPoolStakingAddress: string,
      _toPoolStakingAddress: string,
      _amount: number | string
    ): TransactionObject<void>;

    stake(
      _toPoolStakingAddress: string,
      _amount: number | string
    ): TransactionObject<void>;

    withdraw(
      _fromPoolStakingAddress: string,
      _amount: number | string
    ): TransactionObject<void>;

    orderWithdraw(
      _poolStakingAddress: string,
      _amount: number | string
    ): TransactionObject<void>;

    claimOrderedWithdraw(_poolStakingAddress: string): TransactionObject<void>;

    setCandidateMinStake(_minStake: number | string): TransactionObject<void>;

    setDelegatorMinStake(_minStake: number | string): TransactionObject<void>;

    getPools(): TransactionObject<(string)[]>;

    getPoolsInactive(): TransactionObject<(string)[]>;

    getPoolsLikelihood(): TransactionObject<{
      likelihoods: (BN)[];
      sum: BN;
      0: (BN)[];
      1: BN;
    }>;

    getPoolsToBeElected(): TransactionObject<(string)[]>;

    getPoolsToBeRemoved(): TransactionObject<(string)[]>;

    areStakeAndWithdrawAllowed(): TransactionObject<boolean>;

    isInitialized(): TransactionObject<boolean>;

    isPoolActive(_stakingAddress: string): TransactionObject<boolean>;

    maxWithdrawAllowed(
      _poolStakingAddress: string,
      _staker: string
    ): TransactionObject<BN>;

    maxWithdrawOrderAllowed(
      _poolStakingAddress: string,
      _staker: string
    ): TransactionObject<BN>;

    onTokenTransfer(
      arg0: string,
      arg1: number | string,
      arg2: string | number[]
    ): TransactionObject<boolean>;

    poolDelegators(_poolStakingAddress: string): TransactionObject<(string)[]>;

    poolDelegatorsInactive(
      _poolStakingAddress: string
    ): TransactionObject<(string)[]>;

    stakeAmountByCurrentEpoch(
      _poolStakingAddress: string,
      _staker: string
    ): TransactionObject<BN>;

    stakingEpochEndBlock(): TransactionObject<BN>;
  };
  events: {
    AddedPool: ContractEvent<string>;
    ClaimedOrderedWithdrawal: ContractEvent<{
      fromPoolStakingAddress: string;
      staker: string;
      stakingEpoch: BN;
      amount: BN;
      0: string;
      1: string;
      2: BN;
      3: BN;
    }>;
    MovedStake: ContractEvent<{
      fromPoolStakingAddress: string;
      toPoolStakingAddress: string;
      staker: string;
      stakingEpoch: BN;
      amount: BN;
      0: string;
      1: string;
      2: string;
      3: BN;
      4: BN;
    }>;
    OrderedWithdrawal: ContractEvent<{
      fromPoolStakingAddress: string;
      staker: string;
      stakingEpoch: BN;
      amount: BN;
      0: string;
      1: string;
      2: BN;
      3: BN;
    }>;
    PlacedStake: ContractEvent<{
      toPoolStakingAddress: string;
      staker: string;
      stakingEpoch: BN;
      amount: BN;
      0: string;
      1: string;
      2: BN;
      3: BN;
    }>;
    RemovedPool: ContractEvent<string>;
    WithdrewStake: ContractEvent<{
      fromPoolStakingAddress: string;
      staker: string;
      stakingEpoch: BN;
      amount: BN;
      0: string;
      1: string;
      2: BN;
      3: BN;
    }>;
    allEvents: (
      options?: EventOptions,
      cb?: Callback<EventLog>
    ) => EventEmitter;
  };
}