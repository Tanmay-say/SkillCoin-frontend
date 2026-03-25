/**
 * Self-contained HTML payment page served at localhost:7402
 * Uses ethers.js from CDN for MetaMask wallet connection + native token transfer
 * On Calibration testnet: tFIL (native). Currency label comes from API.
 */

export interface PaymentPageParams {
  skillName: string;
  skillId: string;
  price: number;
  recipient: string;
  currency: string;
  chainId: number;
  rpcUrl: string;
}

export function buildPaymentPage(params: PaymentPageParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Skillcoin Payment — ${params.skillName}</title>
<script src="https://cdn.jsdelivr.net/npm/ethers@6.11.0/dist/ethers.umd.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0a0a1a;
    color: #e0e0e8;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card {
    background: linear-gradient(135deg, #12122a 0%, #1a1a3a 100%);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 48px;
    max-width: 440px;
    width: 90%;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  }
  .logo { font-size: 48px; margin-bottom: 16px; }
  h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
  .subtitle { color: #888; font-size: 14px; margin-bottom: 32px; }
  .skill-info {
    background: rgba(255,255,255,0.04);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
    text-align: left;
  }
  .skill-info .row {
    display: flex; justify-content: space-between;
    padding: 6px 0; font-size: 14px;
  }
  .skill-info .label { color: #888; }
  .skill-info .value { color: #fff; font-weight: 500; }
  .price-tag {
    font-size: 32px; font-weight: 700;
    background: linear-gradient(135deg, #7b61ff, #00d4ff);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    margin: 16px 0;
  }
  .btn {
    width: 100%; padding: 16px; border: none; border-radius: 12px;
    font-size: 16px; font-weight: 600; cursor: pointer;
    transition: all 0.2s;
  }
  .btn-primary {
    background: linear-gradient(135deg, #7b61ff, #6246ea);
    color: white;
  }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(123,97,255,0.3); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .btn-success { background: #10b981; color: white; }
  .btn-danger { background: #ef4444; color: white; }
  .status { margin-top: 16px; font-size: 13px; color: #888; min-height: 20px; }
  .status.error { color: #ef4444; }
  .status.success { color: #10b981; }
  .spinner {
    display: inline-block; width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: #7b61ff; border-radius: 50%;
    animation: spin 0.8s linear infinite;
    vertical-align: middle; margin-right: 8px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .wallet-addr {
    font-family: monospace; font-size: 12px;
    color: #7b61ff; margin-top: 8px;
    word-break: break-all;
  }
  .divider { height: 1px; background: rgba(255,255,255,0.06); margin: 20px 0; }
  .balance-info { font-size: 12px; color: #888; margin-top: 8px; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">⚡</div>
  <h1>Skillcoin Payment</h1>
  <p class="subtitle">Pay to install this skill</p>

  <div class="skill-info">
    <div class="row"><span class="label">Skill</span><span class="value">${params.skillName}</span></div>
    <div class="row"><span class="label">Network</span><span class="value">Filecoin Calibration</span></div>
    <div class="row"><span class="label">Token</span><span class="value">${params.currency}</span></div>
  </div>

  <div class="price-tag">${params.price} ${params.currency}</div>

  <div id="step-connect">
    <button class="btn btn-primary" id="connectBtn" onclick="connectWallet()">
      🦊 Connect MetaMask
    </button>
    <p class="status" id="connectStatus"></p>
  </div>

  <div id="step-pay" style="display:none">
    <p class="wallet-addr" id="walletAddr"></p>
    <p class="balance-info" id="balanceInfo"></p>
    <div class="divider"></div>
    <button class="btn btn-primary" id="payBtn" onclick="pay()">
      Pay ${params.price} ${params.currency}
    </button>
    <p class="status" id="payStatus"></p>
  </div>

  <div id="step-done" style="display:none">
    <button class="btn btn-success" disabled>✓ Payment Complete</button>
    <p class="status success">Transaction confirmed! This tab will close automatically.</p>
    <p class="wallet-addr" id="txHashDisplay"></p>
  </div>

  <div id="step-error" style="display:none">
    <button class="btn btn-danger" onclick="location.reload()">✗ Try Again</button>
    <p class="status error" id="errorMsg"></p>
  </div>
</div>

<script>
const CONFIG = {
  recipient: "${params.recipient}",
  price: "${params.price}",
  chainId: ${params.chainId},
  rpcUrl: "${params.rpcUrl}",
};

let provider, signer, userAddress;

function showStep(step) {
  ['step-connect', 'step-pay', 'step-done', 'step-error'].forEach(s =>
    document.getElementById(s).style.display = s === step ? 'block' : 'none'
  );
}

async function connectWallet() {
  const btn = document.getElementById('connectBtn');
  const status = document.getElementById('connectStatus');

  if (!window.ethereum) {
    status.className = 'status error';
    status.textContent = 'MetaMask not found. Install MetaMask at metamask.io';
    return;
  }

  btn.disabled = true;
  status.innerHTML = '<span class="spinner"></span> Connecting...';

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    // Switch to Filecoin Calibration if needed
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CONFIG.chainId) {
      status.innerHTML = '<span class="spinner"></span> Switching to Filecoin Calibration...';
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x' + CONFIG.chainId.toString(16) }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x' + CONFIG.chainId.toString(16),
              chainName: 'Filecoin Calibration',
              nativeCurrency: { name: 'Test FIL', symbol: '${params.currency}', decimals: 18 },
              rpcUrls: [CONFIG.rpcUrl],
              blockExplorerUrls: ['https://calibration.filfox.info/'],
            }],
          });
        } else { throw switchError; }
      }
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
    }

    // Show balance
    const balance = await provider.getBalance(userAddress);
    const balStr = ethers.formatEther(balance);
    document.getElementById('walletAddr').textContent = userAddress;
    document.getElementById('balanceInfo').textContent = 'Balance: ' + parseFloat(balStr).toFixed(4) + ' ${params.currency}';
    showStep('step-pay');
  } catch (err) {
    btn.disabled = false;
    status.className = 'status error';
    status.textContent = err.message || 'Connection failed';
  }
}

async function pay() {
  const btn = document.getElementById('payBtn');
  const status = document.getElementById('payStatus');

  btn.disabled = true;
  status.innerHTML = '<span class="spinner"></span> Preparing transaction...';

  try {
    const amount = ethers.parseEther(CONFIG.price);

    // Check balance
    const balance = await provider.getBalance(userAddress);
    if (balance < amount) {
      throw new Error('Insufficient funds. You have ' + parseFloat(ethers.formatEther(balance)).toFixed(4) + ' ${params.currency}, need ' + CONFIG.price + ' ${params.currency}.\\nGet test tokens at https://faucet.calibnet.chainsafe-fil.io');
    }

    // Native tFIL transfer
    status.innerHTML = '<span class="spinner"></span> Confirm in MetaMask...';
    const tx = await signer.sendTransaction({
      to: CONFIG.recipient,
      value: amount,
    });

    status.innerHTML = '<span class="spinner"></span> Waiting for confirmation...';
    const receipt = await tx.wait();

    const txHash = receipt.hash;
    document.getElementById('txHashDisplay').textContent = txHash;
    showStep('step-done');

    // Callback to CLI
    await fetch('/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash })
    });

    setTimeout(() => window.close(), 3000);

  } catch (err) {
    if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
      btn.disabled = false;
      status.className = 'status error';
      status.textContent = 'Transaction cancelled';
      return;
    }

    document.getElementById('errorMsg').textContent = err.message || 'Payment failed';
    showStep('step-error');

    fetch('/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    }).catch(() => {});
  }
}
</script>
</body>
</html>`;
}
