'use client'

import { persistor, store } from '@redux/store'
import { Provider } from 'react-redux'
import { ReactNode } from 'react'
import { PersistGate } from 'redux-persist/integration/react'

interface ReduxProviderProps {
    children: ReactNode
}

function ReduxProvider({ children }: ReduxProviderProps) {
    return (
        <Provider store={store}>
            {/* Function child: always render app UI. Default `loading={null}` hides ALL children until
                rehydration — if persist stalls (storage blocked, errors), the screen stays blank forever. */}
            <PersistGate persistor={persistor}>{() => children}</PersistGate>
        </Provider>
    )
}

export default ReduxProvider
