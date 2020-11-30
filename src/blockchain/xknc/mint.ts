import { BigNumber } from '@ethersproject/bignumber'
import { Contract, ContractTransaction } from '@ethersproject/contracts'
import { JsonRpcProvider } from '@ethersproject/providers'
import { ethers } from 'ethers'

import ADDRESSES from '../../addresses'
import { DEC_18, ETH, KNC } from '../../constants'
import { XKNC } from '../../types'
import { estimateGas, getExpectedRate } from '../utils'

import { getXKncContracts } from './helper'

const { formatEther, parseEther } = ethers.utils

const MINT_FEE = 1 // 0.000%
const SLIPPAGE = parseEther('0.99')

export const approveXKnc = async (
  amount: string,
  provider: JsonRpcProvider
): Promise<ContractTransaction> => {
  const { tokenContract, xkncContract } = await getXKncContracts(provider)
  const gasPrice = await estimateGas()

  return tokenContract.approve(xkncContract.address, amount, {
    gasPrice,
  })
}

export const getExpectedQuantityOnMintXKnc = async (
  tradeWithEth: boolean,
  amount: string,
  provider: JsonRpcProvider
): Promise<string> => {
  const inputAmount = parseEther(amount)
  const { kyberProxyContract, network, xkncContract } = await getXKncContracts(
    provider
  )
  const { chainId } = network

  const [kncBalBefore, currentSupply] = await Promise.all([
    xkncContract.getFundKncBalanceTwei(),
    xkncContract.totalSupply(),
  ])

  const ethToTrade = inputAmount.mul(MINT_FEE)

  const ethAddress = ADDRESSES[ETH]
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const kncAddress = ADDRESSES[KNC][chainId]

  let kncBalanceAfter: BigNumber

  if (tradeWithEth) {
    const { expectedRate } = await kyberProxyContract.getExpectedRate(
      ethAddress,
      kncAddress,
      inputAmount
    )
    const kncExpected = ethToTrade.mul(expectedRate)
    kncBalanceAfter = kncExpected.add(kncBalBefore)
  } else {
    kncBalanceAfter = ethToTrade.add(kncBalBefore)
  }

  const mintAmount = kncBalanceAfter
    .sub(kncBalBefore)
    .mul(currentSupply)
    .div(kncBalBefore)
  return formatEther(
    tradeWithEth ? mintAmount.mul(SLIPPAGE).div(DEC_18).div(DEC_18) : mintAmount
  )
}

export const mintXKnc = async (
  tradeWithEth: boolean,
  amount: string,
  provider: JsonRpcProvider
): Promise<ContractTransaction> => {
  const {
    kyberProxyContract,
    tokenContract,
    xkncContract,
  } = await getXKncContracts(provider)
  const gasPrice = await estimateGas()

  if (tradeWithEth) {
    const minRate = await getExpectedRate(
      kyberProxyContract,
      ADDRESSES[ETH],
      tokenContract.address,
      amount
    )
    return xkncContract.mint(minRate.toString(), {
      gasPrice,
      value: amount,
    })
  } else {
    const approvedAmount = await _getApprovedAmount(
      tokenContract,
      xkncContract,
      provider.getSigner()._address
    )
    if (approvedAmount.gt(amount)) {
      return Promise.reject(
        new Error('Please approve the tokens before minting')
      )
    }

    return xkncContract.mintWithKnc(amount, {
      gasPrice,
    })
  }
}

const _getApprovedAmount = async (
  tokenContract: Contract,
  xkncContract: XKNC,
  address: string
) => {
  return tokenContract.allowance(address, xkncContract.address)
}