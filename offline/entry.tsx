import { createRoot } from 'react-dom/client'
import { VaultGate } from '../components/inventory/vault-gate'
createRoot(document.getElementById('root')!).render(<VaultGate offline />)
