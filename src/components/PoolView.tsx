import React, { ReactNode } from 'react';
import { action, computed, observable } from 'mobx';
import { observer } from 'mobx-react';
import BN from 'bn.js';
import Context from '../model/Context';
import { IPool } from '../model/Pool';

export interface PoolViewProps {
  context: Context;
  pool: IPool;
}

@observer
export default class PoolView extends React.Component<PoolViewProps, {}> {
  // static text formating functions.

  private static bigNumberToTimespan(input: BN): string {
    const seconds = input.toNumber();

    if (seconds < 60) {
      return `${seconds} seconds`;
    } if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} minutes`;
    } if (seconds < 3600 * 24) {
      const hours = Math.floor(seconds / 3600);
      return `${hours} hours`;
    }

    const days = Math.floor(seconds / (3600 * 24));
    return `${days} days`;
  }

  @observable private amountStr = '';
  @observable private processing = false;

  // TODO: refactor to reduce duplicate code
  @action.bound
  private async handleWithdrawButton(): Promise<void> {
    this.processing = true;
    const { context, pool } = this.props;
    const withdrawAmount = parseInt(this.amountStr);
    if (Number.isNaN(withdrawAmount)) {
      alert('no amount entered');
    } else if (!context.canStakeOrWithdrawNow) {
      alert('outside staking/withdraw time window');
    } else if (withdrawAmount > pool.myStake.asNumber()) {
      alert('cannot withdraw as much');
    } else {
      const needsClaimTx = await context.withdraw(pool.stakingAddress, withdrawAmount);
      if (needsClaimTx) {
        alert('The withdrawn amount could not immediately be transferred to your account, because the pool is in the current or next validator set.\n'
            + 'You need to wait for the next staking epoch and then click the then appearing "Claim" button in order to initiate the transfer!');
      }
      this.amountStr = '';
    }
    this.processing = false;
  }

  @action.bound
  private async handleStakeButton(): Promise<void> {
    this.processing = true;
    const { context, pool } = this.props;
    const stakeAmount = parseInt(this.amountStr);
    const previousStakeAmount = pool.myStake.asNumber();
    const minStake = pool === context.myPool ? context.candidateMinStake : context.delegatorMinStake;
    if (Number.isNaN(stakeAmount)) {
      alert('no amount entered');
    } else if (stakeAmount > context.myBalance.asNumber()) {
      alert(`insufficient balance (${context.myBalance.print()}) for selected amount ${stakeAmount}`);
    } else if (!context.canStakeOrWithdrawNow) {
      alert('outside staking/withdraw time window');
    } else if (pool !== context.myPool && pool.candidateStake.asNumber() < context.candidateMinStake.asNumber()) {
      // TODO: this condition should be checked before even enabling the button
      alert('insufficient candidate (pool owner) stake');
    } else if (previousStakeAmount + stakeAmount < minStake.asNumber()) {
      alert(`min staking amount is ${minStake.print()}`);
    } else if (pool.isBanned()) {
      alert('cannot stake on a pool which is currently banned');
    } else {
      await context.stake(pool.stakingAddress, stakeAmount);
      this.amountStr = '';
    }
    this.processing = false;
  }

  @action.bound
  private async handleClaimRewardButton(): Promise<void> {
    this.processing = true;
    const { context, pool } = this.props;

    const moreToClaim = await context.claimReward(pool.stakingAddress);
    if (moreToClaim) {
      alert('There is more to be claimed. Click the button again in order to do so.');
    }

    this.processing = false;
  }

  @action.bound
  private async handleClaimStakeButton(): Promise<void> {
    this.processing = true;
    const { context, pool } = this.props;
    if (!context.canStakeOrWithdrawNow) {
      alert('outside staking/withdraw time window');
    } else {
      await context.claimStake(pool.stakingAddress);
    }
    this.processing = false;
  }

  @action.bound
  private handleAmount(e: React.ChangeEvent<HTMLInputElement>): void {
    const inputStr = e.currentTarget.value;
    const parsed = parseInt(inputStr);
    this.amountStr = Number.isNaN(parsed) ? '' : parsed.toString();
  }

  // eslint-disable-next-line class-methods-use-this
  private getPoolClasses(pool: IPool): string {
    if (pool.isBanned()) {
      return 'banned-pool';
    }
    if (!pool.isActive) {
      return 'inactive-pool';
    }
    if (pool.isCurrentValidator) {
      if (pool.isPendingValidator) {
        return 'current-and-pending-validator';
      }
      return 'current-validator';
    }
    if (!pool.isToBeElected) {
      return 'not-to-be-elected';
    }
    if (pool.isPendingValidator) {
      return 'is-pending-validator';
    }
    return '';
  }

  // TODO: this isn't updated when the state of checkCanStakeOrWithdrawNow() changes
  @computed
  private get buttonsEnabled(): boolean {
    const { context } = this.props;
    return context.canStakeOrWithdrawNow && !this.processing;
  }

  public render(): ReactNode {
    const { pool } = this.props;

    // boolean to symbol.
    function b2s(value: boolean | undefined): string {
      if (value === undefined) {
        return '?';
      }
      return value ? '☑' : '☐';
    }

    // create status element
    function cse(boolValue: boolean, text: string, toolTip: string, toolTipNegative?: string): ReactNode {
      const toolTipNegative2Use: string = toolTipNegative ?? toolTip;

      return <div title={boolValue ? toolTip : toolTipNegative2Use}>{b2s(boolValue)} {text}|</div>;
    }

    // const statusStyle : CSS.Properties = {

    // }

    const style = { display: 'flex' };

    // maybe get the information since a node was tracked as unavailable ?

    // eslint-disable-next-line react/destructuring-assignment
    const { myAddr } = this.props.context;

    // ${b2s(pool.isToBeElected)} to be elected
    const rawInfo = (
      <div style={style}>
        {cse(pool.isMe, 'self', `This is your pool,  connected to your address: ${myAddr}`, 'This pool does not belong to your current address.')}
        {cse(pool.isActive, 'active', 'Is this a active pool, the owner has enough stake on it.', 'This pool is inactive')}
        {cse(pool.isCurrentValidator, 'current', 'This pool is currently a  validator in this epoch', 'pool is not a validator in this epoch.')}
        {cse(pool.isAvailable, 'available', `This node is tracked as being available since ${pool.availableSinceAsText}`, 'Node is tracked as unavailable.')}
        {cse(pool.isToBeElected, 'to be elected', 'pool fullfills all requirements and is an electable candidate.', 'pool does not fullfill all requirements and is not able to be elected.')}
        {cse(pool.isPendingValidator, 'pending', 'pool is a pending validator for the next epoch, if the node manages to write acks and parts.', 'pool is not a pending validator')}
        {cse(pool.isBanned(), 'banned', 'pool has been banned', 'pool is not banned')}
      </div>
    );

    let extraInfo = `added in epoch ${pool.addedInEpoch}\n`;
    extraInfo += `blocks authored: ${pool.blocksAuthored}\n`;
    if (pool.isCurrentValidator) {
      extraInfo += 'in validator set of current epoch\n';
    }
    if (!pool.isAvailable && !pool.isToBeElected) {
      extraInfo += `requires to notify availability. Not available since ${PoolView.bigNumberToTimespan(pool.availableSince)}`;
    }

    extraInfo += `available since:  ${pool.availableSince.toString(10)} ${pool.availableSinceAsText}`;

    if (pool.banCount > 0) {
      extraInfo += `ban counter: ${pool.banCount}\n`;
    }
    if (!pool.isActive) {
      extraInfo += 'currently not active\n';
    }
    if (pool.isBanned()) {
      extraInfo += `CURRENTLY BANNED - until epoch ${pool.bannedUntil.toString()}`;
    }

    if (pool.isToBeElected) {
      extraInfo += ' ! elected for NEXT epoch.';
    }

    let validatorInfo = <div />;

    let keyDetails = <div />;

    keyDetails = (
      <small>Pending Validator - Part: {pool.parts ? `${pool.parts.substr(0, 8)}
     ..${pool.parts.substr(pool.parts.length - 8, 8)}` : ''}
      </small>
    );

    if (pool.isPendingValidator) {
      validatorInfo = (
        <div>
          <small>{`${b2s(pool.parts != null && pool.parts.length > 0)} parts written | ${b2s(pool.numberOfAcks > 0)} acks written` }</small>
          {keyDetails}
          <br />
          <small>Pending Validator - Part : {pool.parts ? `${(((pool.parts.length - 2) / 2))} bytes` : 'none'}</small>
          <br />
          <small># of Acks written: {pool.numberOfAcks}</small>
        </div>
      );
    }

    return (
      <tr className={this.getPoolClasses(pool)}>
        <td title={extraInfo}>
          { pool.ensName && <div className="text-monospace-">{pool.ensName}</div> }
          <span className={`text-monospace ${pool.isMe ? ' text-primary' : ''}`}>{pool.stakingAddress}</span><br />
          <small className="text-monospace-">(mining: {pool.miningAddress})</small>
          <small>publicKey:  {pool.miningPublicKey} </small>
          {validatorInfo}
          <small>{rawInfo}</small>

        </td>
        {/* <td className={miningAddressClass}><small>{pool.miningAddress}</small></td> */}
        <td>{Number.isNaN(pool.validatorStakeShare) ? '-' : Math.round(pool.validatorStakeShare)} / {(pool.validatorRewardShare === 0) ? '-' : Math.round(pool.validatorRewardShare)}</td>
        <td>{pool.delegators.length}</td>
        <td>{pool.candidateStake.print()}</td>
        <td>{pool.totalStake.print()}</td>
        <td className={`${pool.myStake.asNumber() > 0 ? 'text-primary' : ''}`}>{pool.myStake.print()}</td>
        <td className={`${pool.claimableStake.canClaimNow() ? 'text-primary' : 'text-secondary'}`}>{pool.claimableStake.amount.print()}</td>
        <td>
          <input
            type="text"
            placeholder="amount"
            value={this.amountStr}
            onChange={this.handleAmount}
          />
          <br />
          <div className="spinner-border" hidden={!this.processing} role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <button type="button" disabled={!this.buttonsEnabled} onClick={this.handleStakeButton}>Stake</button>
          <button type="button" disabled={!this.buttonsEnabled} onClick={this.handleWithdrawButton} hidden={pool.myStake.asNumber() === 0}>Withdraw</button>
          <button type="button" disabled={!this.buttonsEnabled} onClick={this.handleClaimStakeButton} hidden={!pool.claimableStake.canClaimNow()}>Claim</button>
        </td>
        <td>{pool.claimableReward.print()}</td>
        <td>
          <button type="button" disabled={pool.claimableReward.asNumber() === 0} onClick={this.handleClaimRewardButton}>Claim</button>
        </td>
      </tr>
    );
  }
}
