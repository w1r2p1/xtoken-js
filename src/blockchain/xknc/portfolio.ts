import { JsonRpcProvider } from '@ethersproject/providers'
import { Contract } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import { KNC } from 'xtoken-abis'

import { XKNC } from '../../types'
import { IPortfolioItem, ITokenSymbols } from '../../types/xToken'
import { formatNumberWithCommas } from '../../utils'
import { getContract, getUserAvailableTokenBalance } from '../utils'

import { getXKncContracts } from './helper'
import { getXKncPrices } from './prices'

export const getPortfolioItemXKnc = async (
  symbol: ITokenSymbols,
  address: string,
  provider: JsonRpcProvider
): Promise<IPortfolioItem> => {
  const { kyberProxyContract, network, xkncContract } = await getXKncContracts(
    symbol,
    provider
  )
  const { chainId } = network

  const xkncBal = await getUserAvailableTokenBalance(xkncContract, address)
  const kncContract = getContract(KNC, provider, network)

  const { priceUsd } = await getXKncPrices(
    xkncContract,
    kncContract as Contract,
    kyberProxyContract,
    chainId
  )
  const xkncValue = (xkncBal * priceUsd).toFixed(2).toString()
  const tokenEquivalent = await getUnderlyingTokenEquivalent(
    xkncContract,
    address
  )

  return {
    symbol,
    quantity: formatNumberWithCommas(xkncBal.toString()),
    price: `$${priceUsd}`,
    value: `$${formatNumberWithCommas(xkncValue)}`,
    tokenEquivalent,
  }
}

const getUnderlyingTokenEquivalent = async (
  xkncContract: XKNC,
  address: string
) => {
  const [userXkncBal, contractKncBal, xkncSupply] = await Promise.all([
    xkncContract.balanceOf(address),
    xkncContract.getFundKncBalanceTwei(),
    xkncContract.totalSupply(),
  ])

  const userTokenEquivalent = contractKncBal.mul(userXkncBal).div(xkncSupply)
  const tokenEquivalent = formatEther(userTokenEquivalent)

  if (Number(tokenEquivalent) < 1000) return Number(tokenEquivalent).toFixed(2)
  return formatNumberWithCommas(tokenEquivalent)
}
