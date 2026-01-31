'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Loader2
} from 'lucide-react';
import { useUserPositions } from '@/lib/hooks/useUserPositions';
import { formatSOL, formatPercentage, formatCurrency, shortenAddress } from '@/lib/helpers';
import { SpectreSDK } from '@/lib/spectre-sdk';

export function PortfolioTracker() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { positions, loading, error, refreshPositions } = useUserPositions();
  const [settling, setSettling] = useState<string | null>(null);
  const [unsubscribing, setUnsubscribing] = useState<string | null>(null);

  const handleSettleFees = async (strategyKey: string, hasProfit: boolean) => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      alert('Please connect your wallet');
      return;
    }

    if (!hasProfit) {
      alert('No profit available to settle fees. Your position must have positive profit before fees can be settled.');
      return;
    }

    setSettling(strategyKey);
    try {
      const sdk = new SpectreSDK(connection, wallet);
      const strategyPubkey = new PublicKey(strategyKey);
      await sdk.settleFees(wallet.publicKey, strategyPubkey);
      alert('Fees settled successfully!');
      refreshPositions();
    } catch (error: any) {
      console.error('Fee settlement failed:', error);
      
      let errorMsg = 'Failed to settle fees.';
      if (error.message?.includes('NoProfitToSettle')) {
        errorMsg = 'No profit available to settle fees. Please wait for your position to be profitable.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert(errorMsg);
    } finally {
      setSettling(null);
    }
  };

  const handleUnsubscribe = async (strategyKey: string) => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      alert('Please connect your wallet');
      return;
    }

    if (!confirm('Are you sure you want to unsubscribe? This will withdraw all your funds.')) {
      return;
    }

    setUnsubscribing(strategyKey);
    try {
      const sdk = new SpectreSDK(connection, wallet);
      const strategyPubkey = new PublicKey(strategyKey);
      await sdk.unsubscribe(wallet.publicKey, strategyPubkey);
      alert('Successfully unsubscribed and withdrawn funds!');
      refreshPositions();
    } catch (error: any) {
      console.error('Unsubscribe failed:', error);
      
      let errorMsg = 'Failed to unsubscribe. ';
      
      if (error.message?.includes('Transfer: `from` must not carry data') || 
          error.message?.includes('invalid program argument')) {
        errorMsg = 'Unsubscribe feature is currently being updated. The program needs to be redeployed with the fix. Please contact the administrator or try again later.';
      } else if (error.message?.includes('PositionInactive')) {
        errorMsg = 'This position is already inactive.';
      } else if (error.message) {
        errorMsg += error.message;
      } else {
        errorMsg += 'Please try again.';
      }
      
      alert(errorMsg);
    } finally {
      setUnsubscribing(null);
    }
  };

  if (!wallet.publicKey) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-card border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
          <DollarSign className="w-8 h-8 text-primary" />
        </div>
        <p className="text-neutral-400 mb-4">Connect your wallet to view your portfolio</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
        <p className="mt-4 text-neutral-400">Loading your portfolio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error.message}</p>
        <Button onClick={refreshPositions} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-card border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
          <DollarSign className="w-8 h-8 text-neutral-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Active Positions</h3>
        <p className="text-neutral-400">Subscribe to strategies to start trading</p>
      </div>
    );
  }

  // Calculate portfolio metrics
  const totalInitial = positions.reduce((sum, p) => sum + p.initialBalance, 0);
  const totalCurrent = positions.reduce((sum, p) => sum + p.currentBalance, 0);
  const totalFees = positions.reduce((sum, p) => sum + p.totalFeesPaid, 0);
  const totalPnL = totalCurrent - totalInitial;
  const totalPnLPercent = totalInitial > 0 ? (totalPnL / totalInitial) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Portfolio</h2>
        <p className="text-neutral-400 mt-2">
          Track your active positions and performance
        </p>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
              <DollarSign className="w-4 h-4" />
              <span>Total Value</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {formatSOL(totalCurrent)} SOL
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
              {totalPnL >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span>Total P&L</span>
            </div>
            <p className={`text-3xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalPnL >= 0 ? '+' : ''}{formatSOL(totalPnL)} SOL
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              {formatPercentage(totalPnLPercent)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
              <Percent className="w-4 h-4" />
              <span>Total Fees Paid</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {formatSOL(totalFees)} SOL
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
              <Calendar className="w-4 h-4" />
              <span>Active Positions</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {positions.filter(p => p.isActive).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Positions */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white">Active Positions</h3>
        {positions.map((position) => {
          const profit = position.currentBalance - position.initialBalance;
          const profitPercent = (profit / position.initialBalance) * 100;
          const daysSinceSubscribed = Math.floor(
            (Date.now() - position.subscribedAt) / (1000 * 60 * 60 * 24)
          );
          const daysSinceSettlement = Math.floor(
            (Date.now() - position.lastFeeSettlement) / (1000 * 60 * 60 * 24)
          );

          return (
            <Card key={position.strategy} className="bg-card/50 border-white/10 overflow-hidden">
              <CardHeader className="border-b border-white/5">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white">{position.strategyName}</CardTitle>
                    <p className="text-sm text-neutral-500 mt-1">
                      {shortenAddress(position.strategy)}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full border ${
                    profit >= 0 
                      ? 'bg-green-500/10 border-green-500/20 text-green-500'
                      : 'bg-red-500/10 border-red-500/20 text-red-500'
                  }`}>
                    {profit >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    <span className="font-bold">{formatPercentage(profitPercent)}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-neutral-500 text-sm mb-1">Initial Balance</p>
                    <p className="text-white font-semibold">{formatSOL(position.initialBalance)} SOL</p>
                  </div>
                  <div>
                    <p className="text-neutral-500 text-sm mb-1">Current Balance</p>
                    <p className="text-white font-semibold">{formatSOL(position.currentBalance)} SOL</p>
                  </div>
                  <div>
                    <p className="text-neutral-500 text-sm mb-1">P&L</p>
                    <p className={`font-semibold ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {profit >= 0 ? '+' : ''}{formatSOL(profit)} SOL
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-neutral-500 text-sm">Fees Paid</p>
                      {profit > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 rounded-full">
                          Fees Due
                        </span>
                      )}
                    </div>
                    <p className="text-white font-semibold">{formatSOL(position.totalFeesPaid)} SOL</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-4 text-sm text-neutral-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Subscribed {daysSinceSubscribed}d ago</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Last settlement {daysSinceSettlement}d ago</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSettleFees(position.strategy, profit > 0)}
                      disabled={settling === position.strategy || profit <= 0}
                      variant="outline"
                      size="sm"
                      title={profit <= 0 ? 'No profit available to settle' : 'Settle performance fees'}
                    >
                      {settling === position.strategy ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Settling...
                        </>
                      ) : (
                        'Settle Fees'
                      )}
                    </Button>
                    <Button
                      onClick={() => handleUnsubscribe(position.strategy)}
                      disabled={unsubscribing === position.strategy}
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-400/20 hover:bg-red-400/10"
                    >
                      {unsubscribing === position.strategy ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Unsubscribing...
                        </>
                      ) : (
                        'Unsubscribe'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
