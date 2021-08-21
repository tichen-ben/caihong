import React, { Dispatch, useEffect } from 'react'
import { ExternalProvider, Web3Provider } from '@ethersproject/providers'
import { useWeb3React } from '@web3-react/core'
import { useState } from 'react'
import { Modal as ModalUI } from './components/Modal'
import { Chain, ModalProps, Wallet } from './types'
import { createConnector } from './utils/createConnector'

declare global {
  interface Window {
    ethereum: ExternalProvider
  }
}

function parseSendReturn(sendReturn: any): any {
  return sendReturn.result || sendReturn
}

const isAuthorized = async () => {
  if (!window.ethereum) {
    return false
  }

  try {
    // @ts-ignore
    return await window.ethereum.send('eth_accounts').then((sendReturn) => {
      if (parseSendReturn(sendReturn).length > 0) {
        return true
      } else {
        return false
      }
    })
  } catch {
    return false
  }
}

export const useWalletModal = ({
  modal: ModalComponent,
  chains,
  wallets: selectedWallets
}: {
  modal?: React.ComponentType<ModalProps> | false
  wallets: (Wallet | string)[]
  chains?: Chain[]
}) => {
  const {
    activate,
    deactivate,
    library: provider,
    active: isConnected,
    account: address
  } = useWeb3React<Web3Provider>()

  const wallets = selectedWallets.map((w) =>
    typeof w === 'string'
      ? {
          name: w,
          hidden: false,
          options: {}
        }
      : w
  ) as Wallet[]

  const connectToWallet = async (name: string) => {
    const options = wallets.find((w) => w.name === name).options || {}
    const { instance } = await createConnector({ name: name, chains, options })
    await activate(instance)
  }

  useEffect(() => {
    const walletName = localStorage.getItem('rk-last-wallet')

    isAuthorized().then((yes) => {
      if (walletName && !isConnected && window.ethereum && yes) connectToWallet(walletName)
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [isConnecting, setConnecting] = useState(false)

  const connect = () => {
    setConnecting(true)
  }

  const activateConnector = async (c: Wallet) => {
    localStorage.setItem('rk-last-wallet', c.name)
    await connectToWallet(c.name)
    return setConnecting(false)
  }

  const disconnect = () => {
    localStorage.removeItem('rk-last-wallet')
    deactivate()
  }

  if (typeof ModalComponent === 'undefined') {
    const Modal = () => (
      <ModalUI
        wallets={wallets}
        connect={activateConnector}
        isConnecting={isConnecting}
        setConnecting={setConnecting}
      />
    )

    return { Modal, connect, disconnect, provider, isConnected, isConnecting, address }
  } else {
    return { connect, disconnect, provider, isConnected, isConnecting, address }
  }
}