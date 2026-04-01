/**
 * Self-contained HTML payment page served by the CLI.
 * Supports both native-token and ERC-20 transfers via MetaMask + ethers.js.
 */

export interface PaymentPageParams {
  skillName: string;
  skillId: string;
  price: number;
  recipient: string;
  currency: string;
  chainId: number;
  rpcUrl: string;
  paymentType: "native" | "erc20";
  tokenAddress?: string;
  tokenDecimals?: number;
  blockExplorerUrl?: string;
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
    max-width: 460px;
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
    <div class="row"><span class="label">Method</span><span class="value">${params.paymentType === "erc20" ? "ERC-20 Transfer" : "Native Transfer"}</span></div>
    <div class="row"><span class="label">Token</span><span class="value">${params.currency}</span></div>
  </div>

  <div class="price-tag">${params.price} ${params.currency}</div>

  <div id="step-connect">
    <button class="btn btn-primary" id="connectBtn" onclick="connectWallet()">
      Connect MetaMask
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
    <button class="btn btn-success" disabled>Payment Complete</button>
    <p class="status success">Transaction confirmed. This tab will close automatically.</p>
    <p class="wallet-addr" id="txHashDisplay"></p>
  </div>

  <div id="step-error" style="display:none">
    <button class="btn btn-danger" onclick="location.reload()">Try Again</button>
    <p class="status error" id="errorMsg"></p>
  </div>
</div>

<script>
const CONFIG = {
  recipient: "${params.recipient}",
  price: "${params.price}",
  currency: "${params.currency}",
  chainId: ${params.chainId},
  rpcUrl: "${params.rpcUrl}",
  paymentType: "${params.paymentType}",
  tokenAddress: "${params.tokenAddress || ""}",
  tokenDecimals: ${params.tokenDecimals ?? 18},
  blockExplorerUrl: "${params.blockExplorerUrl || "https://calibration.filfox.info/en"}",
};

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

let provider, signer, userAddress;

function showStep(step) {
  ['step-connect', 'step-pay', 'step-done', 'step-error'].forEach((id) => {
    document.getElementById(id).style.display = id === step ? 'block' : 'none';
  });
}

async function switchNetwork() {
  const targetHex = '0x' + CONFIG.chainId.toString(16);
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetHex }],
    });
  } catch (switchError) {
    if (switchError.code !== 4902) throw switchError;
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: targetHex,
        chainName: 'Filecoin Calibration',
        nativeCurrency: { name: 'Test FIL', symbol: 'tFIL', decimals: 18 },
        rpcUrls: [CONFIG.rpcUrl],
        blockExplorerUrls: [CONFIG.blockExplorerUrl],
      }],
    });
  }
}

async function getBalanceText() {
  if (CONFIG.paymentType === 'erc20') {
    if (!CONFIG.tokenAddress) {
      throw new Error('This payment challenge is missing the ERC-20 token address.');
    }
    const token = new ethers.Contract(CONFIG.tokenAddress, ERC20_ABI, provider);
    const balance = await token.balanceOf(userAddress);
    return parseFloat(ethers.formatUnits(balance, CONFIG.tokenDecimals)).toFixed(4) + ' ' + CONFIG.currency;
  }

  const balance = await provider.getBalance(userAddress);
  return parseFloat(ethers.formatEther(balance)).toFixed(4) + ' tFIL';
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
    await provider.send('eth_requestAccounts', []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CONFIG.chainId) {
      status.innerHTML = '<span class="spinner"></span> Switching network...';
      await switchNetwork();
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
    }

    document.getElementById('walletAddr').textContent = userAddress;
    document.getElementById('balanceInfo').textContent = 'Balance: ' + await getBalanceText();
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
    let tx;

    if (CONFIG.paymentType === 'erc20') {
      if (!CONFIG.tokenAddress) {
        throw new Error('The marketplace did not provide a token contract for this payment.');
      }
      const token = new ethers.Contract(CONFIG.tokenAddress, ERC20_ABI, signer);
      const amount = ethers.parseUnits(CONFIG.price, CONFIG.tokenDecimals);
      const balance = await token.balanceOf(userAddress);
      if (balance < amount) {
        throw new Error('Insufficient ' + CONFIG.currency + ' balance for this payment.');
      }
      status.innerHTML = '<span class="spinner"></span> Confirm token transfer in MetaMask...';
      tx = await token.transfer(CONFIG.recipient, amount);
    } else {
      const amount = ethers.parseEther(CONFIG.price);
      const balance = await provider.getBalance(userAddress);
      if (balance < amount) {
        throw new Error('Insufficient tFIL balance. Get test funds from a Calibration faucet.');
      }
      status.innerHTML = '<span class="spinner"></span> Confirm transfer in MetaMask...';
      tx = await signer.sendTransaction({
        to: CONFIG.recipient,
        value: amount,
      });
    }

    status.innerHTML = '<span class="spinner"></span> Waiting for confirmation...';
    const receipt = await tx.wait();
    const txHash = receipt.hash;

    document.getElementById('txHashDisplay').textContent = txHash;
    showStep('step-done');

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
