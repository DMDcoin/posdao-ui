import { observer } from 'mobx-react';
import React from 'react';
import { action, computed, observable } from 'mobx';
import Context from './model/Context';
import './App.css';
import PoolView from './components/PoolView';

interface AppProps {
  context: Context;
}

@observer
class App extends React.Component<AppProps, {}> {
  
  private publicKey = '';
  private stakeAmountStr = '';

  private examplePublicKey = '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
  
  @observable private processing = false;

  @observable private calculatedMiningAddress = '';

  @action.bound
  private async handleAddPool() {
    this.processing = true;
    const { context } = this.props;
    const stakeAmount = parseInt(this.stakeAmountStr);
    if (Number.isNaN(stakeAmount)) {
      alert('no amount entered');
    } else if (!this.calculatedMiningAddress.isAddress()) {
      alert('no valid mining address entered');
    } else if (context.myAddr === this.calculatedMiningAddress) {
      alert('staking/pool address and mining address cannot be the same');
    } else if (!await context.areAddressesValidForCreatePool(context.myAddr, this.calculatedMiningAddress)) {
      alert('staking or mining key are or were already in use with a pool');
    } else if (stakeAmount > context.myBalance.asNumber()) {
      alert(`insufficient balance (${context.myBalance.print()}) for selected amount ${stakeAmount}`);
    } else if (!context.canStakeOrWithdrawNow) {
      alert('outside staking window');
    } else if (stakeAmount < context.candidateMinStake.asNumber()) {
      alert('insufficient candidate (pool owner) stake');
    } else {
      await context.createPool(this.calculatedMiningAddress, this.publicKey, stakeAmount);
    }
    this.processing = false;
  }

  @computed
  get isStakingAllowed(): boolean {
    const { context } = this.props;
    return context.stakingAllowedTimeframe > 0 && context.canStakeOrWithdrawNow;
  }

  @computed
  get stakingAllowedState(): string {
    return this.isStakingAllowed ? 'allowed' : 'NOT allowed';
  }

  // TODO: should the key prop be here or inside the view?
  public render(): JSX.Element {
    const { context } = this.props;
    const minStakeAmount = context.candidateMinStake.print();
    if (this.stakeAmountStr === '') {
      this.stakeAmountStr = minStakeAmount; // init
    }
    const poolList = context.pools.map((pool) => (
      <PoolView context={context} pool={pool} key={pool.stakingAddress} />
    ));

    const validatorsWithoutPoolSection = context.currentValidatorsWithoutPools.map((address) => (
      <div className="text-danger" title="Validators can loose their pool association when the first validators after chain launch fail to take over control. (missed out key generation ?)">Validator without a Pool Association: {address}</div>
    ));

    // TODO: css template/framework / convention to have a decent layout without writing CSS
    return (
      <div className="App">
        <header>
          <p>
            account: <span className="text-primary">{context.myAddr}</span> |
            balance: {context.myBalance.print()} {context.coinSymbol}<br />
            current block nr: {context.currentBlockNumber} | current epoch: {context.stakingEpoch} | epoch start Block {context.epochStartBlock} | epoch start Time {new Date(context.epochStartTime * 1000).toLocaleString()} | deltaPot {context.deltaPot} | reinsertPot {context.reinsertPot}
            {/* <span className={`${this.isStakingAllowed ? 'text-success' : 'text-danger'}`}> staking {this.stakingAllowedState}: {context.stakingAllowedTimeframe} blocks</span> */}
            {validatorsWithoutPoolSection}
          </p>
        </header>
        <div id="poolList">
          <div className="spinner-border" hidden={!context.isSyncingPools} role="status">
            <span className="sr-only">Syncing Pools...</span>
          </div>
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>pool address</th>
                {/* <th>mining address</th> */}
                <th>validator stake share / reward share % in current epoch</th>
                <th>nr delegators</th>
                <th>candidate stake</th>
                <th>total stake</th>
                <th>my stake</th>
                <th>claimable</th>
                <th>staking actions</th>
                <th>uncollected reward</th>
                <th>reward actions</th>
              </tr>
            </thead>
            <tbody>
              {poolList}
            </tbody>
          </table>
        </div>
        <hr />
        <div id="addPool" hidden={context.iHaveAPool || context.isSyncingPools}>
          <form spellCheck={false}>
            <label>pool address:   <input type="text" value={context.myAddr} readOnly title="determined by current wallet address" /></label> <br />
            <label>public key: <input type="text" defaultValue={this.examplePublicKey} onChange={(e) => {
                this.publicKey = e.currentTarget.value;
                this.calculatedMiningAddress = Context.getAddressFromPublicKeyInfoText(this.publicKey);
                }} /></label> <br />
            <label>mining address:</label><label>{this.calculatedMiningAddress}</label><br />
            <label>stake amount ({context.coinSymbol}):  <input type="number" min={minStakeAmount} defaultValue={this.stakeAmountStr} onChange={(e) => (this.stakeAmountStr = e.currentTarget.value)} /></label> <br />
            <div className="spinner-border" hidden={!this.processing} role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <button type="button" disabled={this.processing} onClick={this.handleAddPool}>Add Pool</button>
          </form>
        </div>
        <div id="removePool" hidden={!context.iHaveAPool}>
          <div className="spinner-border" hidden={!this.processing} role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <button type="button" disabled={this.processing}>Remove My Pool (TODO)</button>
        </div>
      </div>
    );
  }
}

export default App;
