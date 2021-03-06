import { Contract } from '@ethersproject/contracts'
import { JsonRpcProvider } from '@ethersproject/providers'
import { KYBER_PROXY } from 'xtoken-abis'

import { KyberProxy, XKNC } from '../../types'
import { ITokenSymbols } from '../../types/xToken'
import { getContract, getTokenSymbol } from '../utils'

export const getXKncContracts = async (
  symbol: ITokenSymbols,
  provider: JsonRpcProvider
) => {
  const network = await provider.getNetwork()

  const xkncContract = getContract(symbol, provider, network) as XKNC
  const kyberProxyContract = getContract(
    KYBER_PROXY,
    provider,
    network
  ) as KyberProxy
  const tokenContract = getContract(
    getTokenSymbol(symbol),
    provider,
    network
  ) as Contract

  if (!xkncContract || !kyberProxyContract || !tokenContract) {
    return Promise.reject(new Error('Unknown error'))
  }

  return {
    kyberProxyContract,
    network,
    tokenContract,
    xkncContract,
  }
}
