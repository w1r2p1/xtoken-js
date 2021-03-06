import { JsonRpcProvider } from '@ethersproject/providers'
import { formatBytes32String, formatEther } from 'ethers/lib/utils'
import { ADDRESSES, SNX, X_SNX_A_ADMIN } from 'xtoken-abis'

import { DEC_18 } from '../../constants'
import { ERC20 } from '../../types'
import { getContract, getTokenBalance } from '../utils'

import { getXSnxContracts } from './helper'

export const getMaximumRedeemableXSnx = async (provider: JsonRpcProvider) => {
  const {
    network,
    tradeAccountingContract,
    xsnxContract,
  } = await getXSnxContracts(provider)
  const { chainId } = network

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const xsnxAdminAddress = ADDRESSES[X_SNX_A_ADMIN][chainId]

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const snxAddress = ADDRESSES[SNX][chainId]
  const snxContract = getContract(SNX, provider, network) as ERC20

  const [
    availableEthBalance,
    totalSupply,
    snxBalanceOwned,
    debtValue,
  ] = await Promise.all([
    tradeAccountingContract.getEthBalance(),
    xsnxContract.totalSupply(),
    getTokenBalance(snxAddress, xsnxAdminAddress, provider),
    snxContract.debtBalanceOf(xsnxAdminAddress, formatBytes32String('sUSD')),
  ])

  const redeemTokenPrice = await tradeAccountingContract.calculateRedeemTokenPrice(
    totalSupply,
    snxBalanceOwned,
    debtValue
  )

  return formatEther(availableEthBalance.mul(DEC_18).div(redeemTokenPrice))
}
