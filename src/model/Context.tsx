import Web3 from 'web3';
import BN from 'bn.js';
import { computed, observable } from 'mobx';
import { BlockHeader } from 'web3-eth';
import { AbiItem } from 'web3-utils';
import { publicToAddress } from 'ethereumjs-util';
import { abi as ValidatorSetAbi } from '../contract-abis/ValidatorSetHbbft.json';
import { abi as StakingAbi } from '../contract-abis/StakingHbbftCoins.json';
import { abi as BlockRewardAbi } from '../contract-abis/BlockRewardHbbftCoins.json';
import { abi as KeyGenHistoryAbi } from '../contract-abis/KeyGenHistory.json';
import { ValidatorSetHbbft } from '../contracts/ValidatorSetHbbft';
import { StakingHbbftCoins } from '../contracts/StakingHbbftCoins';
import { BlockRewardHbbftCoins } from '../contracts/BlockRewardHbbftCoins';
import { KeyGenHistory } from '../contracts/KeyGenHistory';

// eslint-disable-next-line @typescript-eslint/no-var-requires
// const namehash = require('eth-ens-namehash');

// needed for querying injected web3 (e.g. from Metamask)
declare global {
  interface Window {
    ethereum: Web3;
    web3: Web3;
  }
}

// for debug
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let window: any;
window.BN = BN;

type Address = string;

// TODO: check this instead: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call
declare global {
  interface String {
    print(): string; // in ATS units
    asNumber(): number; // in ATS units
    isAddress(): boolean;
  }
}

// TODO: can this be added to the Amount type only (instead of String) without complicating usage?
// eslint-disable-next-line no-extend-native,@typescript-eslint/explicit-function-return-type,func-names
String.prototype.print = function (this: string) {
  const nr = this.asNumber();
  return Math.trunc(nr) === nr ? nr.toString() : nr.toFixed(2);
};
// eslint-disable-next-line no-extend-native,@typescript-eslint/explicit-function-return-type,func-names
String.prototype.asNumber = function (this: string) {
  const web3 = new Web3();
  return parseFloat(web3.utils.fromWei(this));
};
// eslint-disable-next-line no-extend-native,@typescript-eslint/explicit-function-return-type,func-names
String.prototype.isAddress = function (this: string) {
  const web3 = new Web3();
  return web3.utils.isAddress(this);
};

type Amount = string;

interface IDelegator {
  address: Address;
}

export interface IClaimableStake {
  amount: Amount;
  unlockEpoch: number;
  canClaimNow(): boolean;
}

// TODO: be consistent about type (string vs BN vs number) and unit (ATS vs wei) for amounts

// TODO: when is it worth it creating a class / dedicated file?
export interface IPool {
  isActive: boolean; // currently "active" pool
  isToBeElected: boolean; // is to be elected.
  isPendingValidator: boolean; // pending validator for the next staking epoch.
  readonly stakingAddress: Address;
  ensName: string;
  miningAddress: Address;
  addedInEpoch: number;
  isCurrentValidator: boolean;
  candidateStake: Amount;
  totalStake: Amount;
  myStake: Amount;
  claimableStake: IClaimableStake;
  delegators: Array<IDelegator>; // TODO: how to cast to Array<IDelegator> ?
  isMe: boolean;
  validatorStakeShare: number; // percent
  validatorRewardShare: number; // percent
  claimableReward: Amount;
  isBanned(): boolean;
  bannedUntil: BN;
  banCount: number;
  blocksAuthored: number;
  parts: string; // if part of the treshhold key, or pending validator, this holds the PARTS
  numberOfAcks: number; // if part of the treshhold key, or pending validator, this holds the number of ACKS
}


// TODO: dry-run / estimate gas before sending actual transactions
export default class Context {
  @observable public currentBlockNumber!: number;

  @observable public currentTimestamp!: BN;

  @observable public myAddr!: Address;

  // in Ether (not wei!)
  // TODO: initializing to 0 is a lazy shortcut
  @observable public myBalance: Amount = '0';

  public coinSymbol = 'DMD';

  public epochDuration!: number; // currently not changeable

  public candidateMinStake!: Amount;

  public delegatorMinStake!: Amount;

  public hasWeb3BrowserSupport = false;

  @observable public stakingEpoch!: number;

  @observable public epochStartBlock!: number;

  // TODO: find better name
  @observable public canStakeOrWithdrawNow = false;

  // positive value: allowed for n more blocks
  // negative value: allowed in n blocks
  @observable public stakingAllowedTimeframe = 0;

  @observable public isSyncingPools = true;

  @observable public pools: IPool[] = [];

  @observable public currentValidators: Address[] = [];


  // class PotData {
  //   public governancePotAddress!: string;

  //   public governancePotShareNominator!: number;

  //   public governancePotShareDenominator!: number;

  //   public deltaPotPayoutFraction!: number;

  //   public reinsertPotPayoutFraction!: number;

  //   @observable public reinsertPot!: number;

  //   @observable public deltaPot!: number;

  //   private brContract!: BlockRewardHbbftCoins;

  //   // updates the data of the pot that changes very rarely and
  //   // can almost considered static.
  //   // this would require a site refresh to update that data.
  //   public updateStaticPotData(contract: BlockRewardHbbftCoins) {
  //     // TODO:
  //   }

  //   public updatePotDataAfterEpochSwitch(contract: BlockRewardHbbftCoins) {
  //     // TODO:
  //   }
  // }

  // public potData = new PotData();

  // TODO: properly implement singleton pattern
  // eslint-disable-next-line max-len
  public static async initialize(wsUrl: URL, ensRpcUrl: URL, validatorSetContractAddress: Address): Promise<Context> {
    const ctx = new Context();
    ctx.web3WS = new Web3(wsUrl.toString());
    ctx.web3Ens = new Web3(ensRpcUrl.toString());

    // doc: https://metamask.github.io/metamask-docs/API_Reference/Ethereum_Provider
    if (window.ethereum) {
      console.log('web3 injection detected');
      ctx.web3 = new Web3(window.ethereum);
      ctx.hasWeb3BrowserSupport = true;
      ctx.myAddr = ctx.web3.utils.toChecksumAddress((await window.ethereum.enable())[0]);
      console.log('using address: ', ctx.myAddr);
    } else {
      console.log('no web3 detected, falling back.');
      ctx.web3 = ctx.web3WS;
      ctx.hasWeb3BrowserSupport = false;
    }

    // test connections
    try {
      const rpcBlockNr = await ctx.web3.eth.getBlockNumber();
      const wsBlockNr = await ctx.web3WS.eth.getBlockNumber();
      console.log(`block numbers: rpc ${rpcBlockNr}, ws ${wsBlockNr}`);
    } catch (e) {
      console.error(`connection test failed: ${e}`);
    }

    // TODO FIX ENS Stuff.
    // ctx.web3Ens.eth.getBlockNumber().catch(console.error); // test connection (non-blocking)

    // debug
    // window.web3 = ctx.web3;

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: Account[]) => {
        alert(`metamask account changed to ${accounts}. You may want to reload...`);
      });

      window.ethereum.on('chainChanged', (chainId: number) => {
        alert(`metamask chain changed to ${chainId}. You may want to reload...`);
      });
    }

    ctx.defaultTxOpts.from = ctx.myAddr;

    console.log('default: ', ctx.defaultTxOpts);

    await ctx.initContracts(validatorSetContractAddress);

    await ctx.syncPoolsState();
    ctx.isSyncingPools = false;

    await ctx.subscribeToEvents(ctx.web3WS);

    return ctx;
  }

  @computed get myPool(): IPool | undefined {
    return this.pools.filter((p) => p.stakingAddress === this.myAddr)[0];
  }

  @computed
  public get iHaveAPool(): boolean {
    return this.myPool !== undefined;
  }

  // checks if the given addresses can be used for creating a pool
  public async areAddressesValidForCreatePool(stakingAddr: Address, miningAddr: Address): Promise<boolean> {
    // same checks as in ValidatorSet._setStakingAddress()
    return (
      stakingAddr !== miningAddr
      && await this.vsContract.methods.miningByStakingAddress(stakingAddr).call() === '0x0000000000000000000000000000000000000000'
      && await this.vsContract.methods.miningByStakingAddress(miningAddr).call() === '0x0000000000000000000000000000000000000000'
      && await this.vsContract.methods.stakingByMiningAddress(stakingAddr).call() === '0x0000000000000000000000000000000000000000'
      && await this.vsContract.methods.stakingByMiningAddress(miningAddr).call() === '0x0000000000000000000000000000000000000000'
    );
  }

  public static getAddressFromPublicKeyInfoText(publicKey: string): string {
    try {
      if (publicKey.length === 0) {
        return '';
      }
      return Context.getAddressFromPublicKey(publicKey);
    } catch (err) {
      return 'Invalid Public Key.';
    }
  }

  public static getAddressFromPublicKey(publicKey: string): string {
    const resultBuffer = publicToAddress(Buffer.from(publicKey, 'hex'), true);
    return `0x${resultBuffer.toString('hex')}`;
  }

  /** creates a pool for the sender account, making the sender account a posdao "candidate"
   * The caller is responsible for parameter validity, checking sender balance etc.
   * @parm initialStake amount (in ATS) of initial candidate stake
   * TODO: figure out return type and how to deal with asynchrony and errors
   */
  public async createPool(miningKeyAddr: Address, publicKey: string, initialStake: number): Promise<void> {
    console.log(`${this.myAddr} wants to add Pool with initial stake ${initialStake}`);

    if (!this.canStakeOrWithdrawNow) {
      return;
    }

    const miningKeyAddrCompare = Context.getAddressFromPublicKey(publicKey);
    if (miningKeyAddr !== miningKeyAddrCompare) {
      throw Error(`Expected public key to match address! ${miningKeyAddrCompare}`);
    }

    const txOpts = { ...this.defaultTxOpts };
    txOpts.value = this.web3.utils.toWei(initialStake.toString());

    try {
      const publicKeyHex = `0x${publicKey}`;
      const ip = '0x00000000000000000000000000000000';
      // <amount> argument is ignored by the contract (exists for chains with token based staking)
      const receipt = await this.stContract.methods.addPool(miningKeyAddr, publicKeyHex, ip).send(txOpts);
      console.log(`receipt: ${JSON.stringify(receipt, null, 2)}`);
    } catch (e) {
      console.log(`failed with ${e}`);
    }
  }

  // stake the given amount (in ATS) on the given pool (identified by staking address)
  // TODO: use Amount type, but make sure it's in wei
  // TODO: figure out return type and how to deal with asynchrony and errors
  public async stake(poolAddr: Address, amount: number): Promise<void> {
    console.log(`${this.myAddr} wants to stake ${amount} ATS on pool ${poolAddr}`);

    if (!this.canStakeOrWithdrawNow) {
      return;
    }

    const txOpts = { ...this.defaultTxOpts };
    txOpts.value = this.web3.utils.toWei(amount.toString());

    try {
      // amount is ignored
      const receipt = await this.stContract.methods.stake(poolAddr).send(txOpts);
      // console.log(`receipt: ${JSON.stringify(receipt, null, 2)}`);
      console.log(`tx ${receipt.transactionHash} for stake(): block ${receipt.blockNumber}, ${receipt.gasUsed} gas`);
    } catch (e) {
      console.log(`failed with ${e}`);
    }
  }

  /**
   * Allows stakes to be moved to another pool in a single transaction (instead of withdraw() + stake())
   * Available only while fromPool is NOT in the validator set AND during staking epoch
   */
  public async moveStake(fromPoolAddr: Address, toPoolAddr: Address, amount: number): Promise<void> {
    console.log(`${this.myAddr} wants to move ${amount} ATS from pool ${fromPoolAddr} to ${toPoolAddr}`);

    if (!this.canStakeOrWithdrawNow) {
      return;
    }

    const txOpts = { ...this.defaultTxOpts };
    const amountWei = this.web3.utils.toWei(amount.toString());

    try {
      // amount is ignored
      const receipt = await this.stContract.methods.moveStake(fromPoolAddr, toPoolAddr, amountWei).send(txOpts);
      // console.log(`receipt: ${JSON.stringify(receipt, null, 2)}`);
      console.log(`tx ${receipt.transactionHash} for moveStake(): block ${receipt.blockNumber}, ${receipt.gasUsed} gas`);
    } catch (e) {
      console.log(`failed with ${e}`);
    }
  }

  /** withraw the given amount (in ATS) from the given pool (identified by staking address)
   *
   * A withdrawal can happen in 2 ways:
   * a) If the given pool is in the current or in the next validator set, withdraw() "orders" a withdrawal.
   *    The given amount is then available to be "claimed" (additional transaction) from the next epoch onward.
   * b) If the given pool is NOT in the current or in the next validator set, withdraw() already transfers the
   *    given amount to the staking address - no second step needed.
   *
   * This method automatically determines and executes the right smart contract method to be used.
   * It's up to the caller to claim ordered withdrawals at a later time if needed.
   *
   * TODO: deal with frozen stakes due to banned pools
   *
   * @param poolAddr: address of the pool from which to withdraw part or all of the stake
   * @param amount: the amount to be withdrawn (in ATS units). Needs to be <= the current stake in that pool
   *
   * @return true if a consecutive claim transaction is needed in order to transfer the requested amount
   */
  // TODO: refactor to reduce redundancy with method stake()
  public async withdraw(poolAddr: Address, amount: number): Promise<boolean> {
    console.log(`${this.myAddr} wants to withdraw ${amount} ATS from pool ${poolAddr}`);

    console.assert(this.canStakeOrWithdrawNow, 'withdraw currently not allowed');

    const txOpts = { ...this.defaultTxOpts };
    const amountWeiBN: BN = this.web3.utils.toWei(new BN(amount));

    // determine available withdraw method and allowed amount
    const maxWithdrawAmount = await this.stContract.methods.maxWithdrawAllowed(poolAddr, this.myAddr).call();
    const maxWithdrawOrderAmount = await this.stContract.methods.maxWithdrawOrderAllowed(poolAddr, this.myAddr).call();
    console.assert(maxWithdrawAmount === '0' || maxWithdrawOrderAmount === '0', 'max withdraw amount assumption violated');

    try {
      if (maxWithdrawAmount !== '0') {
        console.assert(new BN(maxWithdrawAmount).gte(amountWeiBN), 'requested withdraw amount exceeds max');
        const receipt = await this.stContract.methods.withdraw(poolAddr, amountWeiBN.toString()).send(txOpts);
        console.log(`tx ${receipt.transactionHash} for withdraw(): block ${receipt.blockNumber}, ${receipt.gasUsed} gas`);
      } else {
        console.assert(new BN(maxWithdrawOrderAmount).gte(amountWeiBN), 'requested withdraw order amount exceeds max');
        const receipt = await this.stContract.methods.orderWithdraw(poolAddr, amountWeiBN.toString()).send(txOpts);
        console.log(`tx ${receipt.transactionHash} for orderWithdraw(): block ${receipt.blockNumber}, ${receipt.gasUsed} gas`);
        return true;
      }
    } catch (e) {
      console.log(`failed with ${e}`);
    }
    return false;
  }

  /** claims a previously ordered withdraw, triggering transfer of the full available amount
   * It's the caller's responsibility to determine if there's something to be claimed before calling this method.
   */
  public async claimStake(poolAddr: Address): Promise<void> {
    console.log(`${this.myAddr} wants to claim the available stake from pool ${poolAddr}`);
    console.assert(this.canStakeOrWithdrawNow, 'withdraw currently not allowed');
    const txOpts = { ...this.defaultTxOpts };

    try {
      const receipt = await this.stContract.methods.claimOrderedWithdraw(poolAddr).send(txOpts);
      console.log(`tx ${receipt.transactionHash} for claimOrderedWithdraw(): block ${receipt.blockNumber}, ${receipt.gasUsed} gas`);
    } catch (e) {
      console.log(`failed with ${e}`);
    }
  }

  /**
   * Claims the collected block reward from the given pool.
   * Since the gas price for this transaction grows linearly with the number of epochs, it may not be possible
   * to claim all rewards in a single tx.
   * In such cases, this method will claim only a portion of the rewards and the caller needs to
   * invoke the method again for claiming the rest.
   *
   * @return true if there's more to be claimed after this call, false otherwise
   */
  public async claimReward(poolAddr: Address): Promise<boolean> {
    console.log(`${this.myAddr} wants to claim the available reward from pool ${poolAddr}`);
    const txOpts = { ...this.defaultTxOpts };
    txOpts.gasLimit = '8000000'; // this txs are expensive

    const epochList = await this.brContract.methods.epochsToClaimRewardFrom(poolAddr, this.myAddr).call();

    // gas cost is about 35k per epoch. Thus for 150 epochs it should be safely below 6M gas
    const txEpochList = epochList.slice(0, 150);

    console.log(`claimReward: claiming for ${txEpochList.length} of ${epochList.length} epochs...`);

    try {
      // TODO: this can run out of gas (after too many epochs). Solution: break down into multiple txs
      const receipt = await this.stContract.methods.claimReward(txEpochList, poolAddr).send(txOpts);
      console.log(`tx ${receipt.transactionHash} for claimReward(): block ${receipt.blockNumber}, ${receipt.gasUsed} gas`);
    } catch (e) {
      console.log(`failed with ${e}`);
      return true;
    }

    // TODO: this shouldn't be done here, but in a handler for event 'ClaimedReward'
    const newClaimableReward = await this.getClaimableReward(poolAddr);
    const curPool = this.pools.filter((p) => p.stakingAddress === poolAddr)[0];
    console.assert(curPool !== undefined);
    curPool.claimableReward = newClaimableReward;

    return epochList.length > txEpochList.length;
  }

  // ============================= PRIVATE INTERFACE ==================================

  // connection provided via Metamask.
  private web3!: Web3;

  // additional websocket connection for better subscription performance - see https://github.com/MetaMask/metamask-extension/issues/1645
  // TODO: make sure both web3 instances get connected to the same network
  private web3WS!: Web3;

  // web3 instance for the network we use for ENS in order to fetch names for pools
  public web3Ens!: Web3;

  // TODO: find better names for the contract instances
  private vsContract!: ValidatorSetHbbft;

  private stContract!: StakingHbbftCoins;

  private brContract!: BlockRewardHbbftCoins;

  private kghContract!: KeyGenHistory;

  // start block of the first epoch (epoch 0) since posdao was activated
  // private posdaoStartBlock!: number;

  // TODO: we should probably get rid of either start or end block, can be calculated with epochDuration
  private stakingEpochStartTime!: number;

  private stakingEpochEndTime!: number;

  private stakeWithdrawDisallowPeriod!: number;

  // <from> is set when initializing
  // TODO: this should be readonly to prevent accidental overwriting. How?
  private defaultTxOpts = {
    from: '', gasPrice: '100000000000', gasLimit: '6000000', value: '0',
  };

  // it's not useless, but made private
  // eslint-disable-next-line no-useless-constructor,@typescript-eslint/no-empty-function
  private constructor() {}

  private async initContracts(validatorSetContractAddress: Address): Promise<void> {
    try {
      // TODO: if a contract call fails, the stack trace doesn't show the actual line number.
      console.log('validatorSet Contract: ', validatorSetContractAddress);
      this.vsContract = new this.web3.eth.Contract((ValidatorSetAbi as AbiItem[]), validatorSetContractAddress);
      const stAddress = await this.vsContract.methods.stakingContract().call();
      console.log('stAddress: ', stAddress);
      this.stContract = new this.web3.eth.Contract((StakingAbi as AbiItem[]), stAddress);
      const brAddress = await this.vsContract.methods.blockRewardContract().call();
      this.brContract = new this.web3WS.eth.Contract((BlockRewardAbi as AbiItem[]), brAddress);
      const kghAddress = await this.vsContract.methods.keyGenHistoryContract().call();
      this.kghContract = new this.web3.eth.Contract((KeyGenHistoryAbi as AbiItem[]), kghAddress);
    } catch (e) {
      console.log(`initializing contracts failed: ${e}`);
      throw e;
    }

    this.candidateMinStake = await this.stContract.methods.candidateMinStake().call();
    this.delegatorMinStake = await this.stContract.methods.delegatorMinStake().call();

    // those values are asumed to be not changeable.
    this.epochDuration = parseInt(await this.stContract.methods.stakingFixedEpochDuration().call());
    this.stakeWithdrawDisallowPeriod = parseInt(await this.stContract.methods.stakingWithdrawDisallowPeriod().call());


    await this.retrieveValuesFromContract();
    // this.posdaoStartBlock = this.stakingEpochStartBlock - this.stakingEpoch * this.epochDuration;
  }

  private async retrieveValuesFromContract(): Promise<void> {
    const oldStakingEpoch = this.stakingEpoch;
    this.stakingEpoch = parseInt(await this.stContract.methods.stakingEpoch().call());

    if (this.stakingEpoch !== oldStakingEpoch) {
      this.epochStartBlock = parseInt(await this.stContract.methods.stakingEpochStartBlock().call());
      this.stakingEpochStartTime = parseInt(await this.stContract.methods.stakingEpochStartTime().call());

      // could be calculated instead of called from smart contract?!
      this.stakingEpochEndTime = parseInt(await this.stContract.methods.stakingFixedEpochEndTime().call());
    }

    if (this.hasWeb3BrowserSupport) {
      this.myBalance = await this.web3.eth.getBalance(this.myAddr);
    }

    this.canStakeOrWithdrawNow = await this.stContract.methods.areStakeAndWithdrawAllowed().call();
  }

  private async getBanCount(miningAddress: string): Promise<number> {
    return parseInt(await this.vsContract.methods.banCounter(miningAddress).call());
  }

  private async getBannedUntil(miningAddress: string): Promise<BN> {
    return new BN((await this.vsContract.methods.bannedUntil(miningAddress).call()));
  }

  private async getMyStake(stakingAddress: string): Promise<string> {
    if (!this.hasWeb3BrowserSupport) {
      return '0';
    }
    return this.stContract.methods.stakeAmount(stakingAddress, this.myAddr).call();
  }

  private async updatePool(pool: IPool,
    activePoolAddrs: Array<string>,
    inactivePoolAddrs: Array<string>,
    toBeElectedPoolAddrs: Array<string>,
    pendingValidatorAddrs: Array<string>): Promise<void> {
    const { stakingAddress } = pool;
    console.log(`checking pool ${stakingAddress}`);
    const ensNamePromise = this.getEnsNameOf(pool.stakingAddress);

    // TODO: figure out if this value can be cached or not.
    pool.miningAddress = await this.vsContract.methods.miningByStakingAddress(stakingAddress).call();
    const { miningAddress } = pool;

    pool.isActive = activePoolAddrs.indexOf(stakingAddress) >= 0;
    pool.isToBeElected = toBeElectedPoolAddrs.indexOf(stakingAddress) >= 0;

    pool.isPendingValidator = pendingValidatorAddrs.indexOf(miningAddress) >= 0;
    pool.isCurrentValidator = this.currentValidators.indexOf(miningAddress) >= 0;

    pool.candidateStake = await this.stContract.methods.stakeAmount(stakingAddress, stakingAddress).call();
    pool.totalStake = await this.stContract.methods.stakeAmountTotal(stakingAddress).call();
    pool.myStake = await this.getMyStake(stakingAddress);

    if (this.hasWeb3BrowserSupport) {
      const claimableStake = {
        amount: await this.stContract.methods.orderedWithdrawAmount(stakingAddress, this.myAddr).call(),
        unlockEpoch: parseInt(await this.stContract.methods.orderWithdrawEpoch(stakingAddress, this.myAddr).call()) + 1,
        // this lightweigt solution works, but will not trigger an update by itself when its value changes
        canClaimNow: () => claimableStake.amount.asNumber() > 0 && claimableStake.unlockEpoch <= this.stakingEpoch,
      };
      pool.claimableStake = claimableStake;
    } else {
      const claimableStake = {
        amount: '0',
        unlockEpoch: 0,
        // this lightweigt solution works, but will not trigger an update by itself when its value changes
        canClaimNow: () => false,
      };
      pool.claimableStake = claimableStake;
    }


    // TODO: delegatorAddrs ?!
    // pool.delegatorAddrs = Array<string> = await this.stContract.methods.poolDelegators(stakingAddress).call();


    pool.bannedUntil = await this.getBannedUntil(miningAddress);
    pool.banCount = await this.getBanCount(miningAddress);

    // const stEvents = await this.stContract.getPastEvents('allEvents', { fromBlock: 0 });
    // there are between 1 and n AddedPool events per pool. We're looking for the first one
    // const poolAddedEvent = stEvents.filter((e) => e.event === 'AddedPool'
    //  && e.returnValues.poolStakingAddress === stakingAddress)

    //   .sort((e1, e2) => e1.blockNumber - e2.blockNumber);

    //  console.assert(poolAddedEvent.length > 0, `no AddedPool event found for ${stakingAddress}`);

    // if (poolAddedEvent.length === 0) {
    //   console.error(stEvents);
    // }

    // result can be negative for pools added as "initial validators", thus setting 0 as min value
    // const addedInEpoch = Math.max(0, Math.floor((poolAddedEvent[0].blockNumber
    //  - this.posdaoStartBlock) / this.epochDuration));

    // TODO FIX: what's the use for addedInEpoch ?!
    // const addedInEpoch = 0;

    // fetch and add the number of blocks authored per epoch since this pool was created
    // const blocksAuthored = await [...Array(this.stakingEpoch - addedInEpoch)]
    //   .map(async (_, i) => parseInt(await this.brContract.methods.blocksCreated(this.stakingEpoch
    // - i, miningAddress).call()))
    //   .reduce(async (acc, cur) => await acc + await cur);

    // const blocksAuthored = 0;

    if (pool.isPendingValidator) {
      pool.parts = await this.kghContract.methods.parts(miningAddress).call();
      const acksLengthBN = new BN(await this.kghContract.methods.getAcksLength(miningAddress).call());
      pool.numberOfAcks = acksLengthBN.toNumber();
    } else { // could just have lost the pendingValidatorState - so we clear this field ?!
      pool.parts = '';
      pool.numberOfAcks = 0;
    }

    // done in the background, non-blocking
    ensNamePromise.then((name) => {
      pool.ensName = name;
    });
  }

  private createEmptyPool(stakingAddress: string): IPool {
    const newPool: IPool = {
      isActive: false,
      isToBeElected: false,
      isPendingValidator: false,
      miningAddress: '',
      isCurrentValidator: false,
      stakingAddress,
      ensName: '',
      candidateStake: '0',
      totalStake: '0',
      myStake: '0',
      claimableStake: {
        amount: '0',
        unlockEpoch: 0,
        canClaimNow: () => false,
      },
      delegators: [],
      isMe: false,
      validatorRewardShare: 0,
      validatorStakeShare: 0,
      claimableReward: '0',
      bannedUntil: new BN('0'),
      isBanned: () => newPool.bannedUntil.gt(new BN(this.currentTimestamp)),
      banCount: 0,
      addedInEpoch: 0,
      blocksAuthored: 0,
      parts: '',
      numberOfAcks: 0,
    };
    return newPool;
  }


  // (re-)builds the data structure this.pools based on the current state on chain
  // This may become overkill in a busy system. It should be possible to do more fine-grained updates instead.
  // But for a start, this does the job.
  // private async syncPoolsState(): Promise<void> {

  // this.pools = [];
  // const activePoolAddrs: Array<string> = await this.stContract.methods.getPools().call();
  // console.log('active Pools:', activePoolAddrs);
  // const inactivePoolAddrs: Array<string> = await this.stContract.methods.getPoolsInactive().call();
  // console.log('inactive Pools:', inactivePoolAddrs);
  // const toBeElectedPoolAddrs = await this.stContract.methods.getPoolsToBeElected().call();
  // console.log('to be elected Pools:', toBeElectedPoolAddrs);
  // const pendingValidatorAddrs = await this.vsContract.methods.getPendingValidators().call();
  // console.log('pendingMiningPools:', pendingValidatorAddrs);

  // console.log(`syncing ${activePoolAddrs.length} active and ${inactivePoolAddrs.length} inactive pools...`);
  // const poolAddrs = activePoolAddrs.concat(inactivePoolAddrs);

  // await this.updateCurrentValidators();

  // const currentValidatorsUnsorted = (await this.vsContract.methods.getValidators().call());
  // const currentValidators: Array<string> = [...currentValidatorsUnsorted].sort();

  // this.currentValidators = currentValidators;

  // const pools: IPool[] = [];

  // await Promise.all(poolAddrs.map(async (stakingAddress) => {

  //   const newPool: IPool = this.createEmptyPool(stakingAddress);
  //   await this.updatePool(newPool, activePoolAddrs, inactivePoolAddrs,
  //     toBeElectedPoolAddrs, pendingValidatorAddrs);

  //   console.log('adding:', newPool);

  //   pools.push(newPool);
  // }));


  // console.log(`sync done, ${this.pools.length} pools in list`);
  // }

  /* eslint-disable class-methods-use-this */
  /* eslint-disable @typescript-eslint/no-unused-vars */
  private async getEnsNameOf(addr: Address): Promise<string> {
    return '';
  }

  /* eslint-enable @typescript-eslint/no-unused-vars */
  /* eslint-enable class-methods-use-this */

  // TODO: Reactivate ENS Name Support.
  // private async getEnsNameOf(addr: Address): Promise<string> {
  //   const lookup = `${addr.toLowerCase().substr(2)}.addr.reverse`;
  //   const ResolverContract = await this.web3Ens.eth.ens.resolver(lookup);
  //   const nh = namehash.hash(lookup);
  //   try {
  //     return await ResolverContract.methods.name(nh).call();
  //   } catch (e) {
  //     return '';
  //   }
  // }

  // flags pools in the current validator set.
  // TODO: make this more robust (currently depends on assumption about the order of event handling)
  private async syncPoolsState(): Promise<void> {
    const newCurrentValidatorsUnsorted = (await this.vsContract.methods.getValidators().call());
    const newCurrentValidators = [...newCurrentValidatorsUnsorted].sort();
    // apply filter here ?!

    const activePoolAddrs: Array<string> = await this.stContract.methods.getPools().call();
    console.log('active Pools:', activePoolAddrs);
    const inactivePoolAddrs: Array<string> = await this.stContract.methods.getPoolsInactive().call();
    console.log('inactive Pools:', inactivePoolAddrs);
    const toBeElectedPoolAddrs = await this.stContract.methods.getPoolsToBeElected().call();
    console.log('to be elected Pools:', toBeElectedPoolAddrs);
    const pendingValidatorAddrs = await this.vsContract.methods.getPendingValidators().call();
    console.log('pendingMiningPools:', pendingValidatorAddrs);

    console.log(`syncing ${activePoolAddrs.length} active and ${inactivePoolAddrs.length} inactive pools...`);
    const poolAddrs = activePoolAddrs.concat(inactivePoolAddrs);

    // make sure both arrays were sorted beforehand
    if (this.currentValidators.toString() !== newCurrentValidators.toString()) {
      console.log(`validator set changed in block ${this.currentBlockNumber} to: ${newCurrentValidators}`);
      this.currentValidators = newCurrentValidators;
    }

    // check if there is a new pool that is not tracked yet within the context.
    poolAddrs.forEach((poolAddress) => {
      const findResult = this.pools.find((x) => x.stakingAddress === poolAddress);
      if (!findResult) {
        this.pools.push(this.createEmptyPool(poolAddress));
      }
    });

    this.pools.forEach(async (p) => {
      await this.updatePool(p, activePoolAddrs, inactivePoolAddrs, toBeElectedPoolAddrs, pendingValidatorAddrs);
    });

    this.pools = this.pools.sort((a, b) => a.stakingAddress.localeCompare(b.stakingAddress));
  }

  private async getValidatorStakeShare(miningAddr: Address): Promise<number> {
    const vStake = await this.brContract.methods.snapshotPoolValidatorStakeAmount(this.stakingEpoch, miningAddr).call();
    const totalStake = await this.brContract.methods.snapshotPoolTotalStakeAmount(this.stakingEpoch, miningAddr).call();
    return (vStake.asNumber() * 100) / totalStake.asNumber();
  }

  private async getValidatorRewardShare(stakingAddr: Address): Promise<number> {
    return parseInt(await this.brContract.methods.validatorRewardPercent(stakingAddr).call()) / 10000;
  }

  private async getClaimableReward(stakingAddr: Address): Promise<Amount> {
    if (!this.hasWeb3BrowserSupport) {
      return '0';
    }
    // getRewardAmount() fails if invoked for a staker without stake in the pool, thus we check that beforehand
    const hasStake: boolean = stakingAddr === this.myAddr ? true : (await this.stContract.methods.stakeFirstEpoch(stakingAddr, this.myAddr).call()) !== '0';
    return hasStake ? this.stContract.methods.getRewardAmount([], stakingAddr, this.myAddr).call() : '0';
  }

  private async handleNewEpoch(): Promise<void> {
    console.log(`new epoch: ${this.stakingEpoch}`);
    await this.pools.forEach(async (pool) => {
      pool.validatorStakeShare = await this.getValidatorStakeShare(pool.miningAddress);
      pool.validatorRewardShare = await this.getValidatorRewardShare(pool.stakingAddress);
      pool.claimableReward = await this.getClaimableReward(pool.stakingAddress);
      pool.banCount = await this.getBanCount(pool.stakingAddress);
      pool.bannedUntil = await this.getBannedUntil(pool.miningAddress);
      pool.myStake = await this.getMyStake(pool.stakingAddress);
    });
  }

  // returns true if the given pool is in the current ValidatorSet
  private isCurrentValidator(miningAddr: Address): boolean {
    return this.currentValidators.indexOf(miningAddr) >= 0;
  }

  // does relevant state updates and checks if the epoch changed
  private async handleNewBlock(web3Instance: Web3, blockHeader: BlockHeader): Promise<void> {
    this.currentBlockNumber = blockHeader.number;
    this.currentTimestamp = new BN(blockHeader.timestamp);

    if (this.hasWeb3BrowserSupport) {
      this.myBalance = await web3Instance.eth.getBalance(this.myAddr);
    }

    // epoch change
    console.log(`updating stakingEpochEndBlock at block ${this.currentBlockNumber}`);
    const oldEpoch = this.stakingEpoch;
    await this.retrieveValuesFromContract();

    if (oldEpoch !== this.stakingEpoch) {
      await this.handleNewEpoch();
    }

    // TODO FIX: blocks left in Epoch can't get told.
    // const blocksLeftInEpoch = this.stakingEpochEndBlock - this.currentBlockNumber;
    // if (blocksLeftInEpoch < 0) {
    //   // TODO: we should have a contract instance connected via websocket in order to avoid this delay
    //   console.log('stakingEpochEndBlock in the past :-/');
    // } else if (blocksLeftInEpoch > this.stakeWithdrawDisallowPeriod) {
    //   this.stakingAllowedTimeframe = blocksLeftInEpoch - this.stakeWithdrawDisallowPeriod;
    // } else {
    //   this.stakingAllowedTimeframe = -blocksLeftInEpoch;
    // }

    // TODO: due to the use of 2 different web3 instances, this bool may not always match stakingAllowedTimeframe
    this.canStakeOrWithdrawNow = await this.stContract.methods.areStakeAndWithdrawAllowed().call();

    // TODO: don't do this in every block. There's no event we can rely on, but we can be smarter than this
    // await this.updateCurrentValidators();

    await this.syncPoolsState();
  }

  private handledStEvents = new Set<number>();
  // listens for events we're interested in and triggers actions accordingly
  // TODO: does the mix of 2 web3 instances as event source cause troubles?
  private async subscribeToEvents(web3Instance: Web3): Promise<void> {
    this.currentBlockNumber = await web3Instance.eth.getBlockNumber();
    web3Instance.eth.subscribe('newBlockHeaders', async (error, blockHeader) => {
      if (error) {
        console.error(error);
        throw Error(`block listener error: ${error}`);
      }
      await this.handleNewBlock(web3Instance, blockHeader);
    });

    this.stContract.events.allEvents({}, async (error, event) => {
      if (error) {
        console.log(`event error: ${error}`);
      } else if (this.handledStEvents.has(event.blockNumber)) {
        console.log(`staking contract event for block ${event.blockNumber} already handled, ignoring`);
      } else {
        this.handledStEvents.add(event.blockNumber);
        console.log(`staking contract event ${event.event} originating from ${event.address} at block ${event.blockNumber}`);
        if (event.event !== 'ClaimedReward') {
          this.isSyncingPools = true;
          await this.syncPoolsState();
          this.isSyncingPools = false;
        }
      }
    });

    // TODO FIX: What's that ?
    // listen to InitiateChange events. Those signal Parity to switch validator set.
    // for logging purposes only at the moment
    // re-read pools on any contract event
    // this.vsContract.events.InitiateChange({}, async (error, event) => {
    //   if (error) {
    //     console.log(`event error: ${error}`);
    //   } else {
    //     console.log(`validatorset contract event ${event.event} at block ${event.blockNumber}`);
    //     // TODO: if any handler is added here, make sure it's not triggered more than once per block
    //   }
    // });
  }
}
