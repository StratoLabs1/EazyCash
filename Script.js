const contractAddress = '0x54673e24D608E5135Eb0F6628E2179a72f1aF6aD';
const abi = [[/* Your contract ABI here */]];
const usdtAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // USDT contract address
const usdtAbi = [/* USDT contract ABI here */]; // Add the ABI of the USDT contract
const web3 = new Web3(Web3.givenProvider || 'https://arb1.arbitrum.io/rpc/'); // Arbitrum RPC URL
let contract;
let usdtContract; // Define USDT contract variable
let userAddress;

// Initialize the contract and wallet connection
async function init() {
    try {
        const accounts = await web3.eth.requestAccounts();
        userAddress = accounts[0];
        contract = new web3.eth.Contract(abi, contractAddress);
        usdtContract = new web3.eth.Contract(usdtAbi, usdtAddress); // Initialize USDT contract instance
        document.getElementById('wallet-address').innerText = userAddress;

        const networkId = await web3.eth.net.getId();
        if (networkId !== 42161) { // Arbitrum One network ID
            document.getElementById('network-info').innerText = 'Please switch to the Arbitrum One network.';
        } else {
            document.getElementById('network-name').innerText = 'Arbitrum One';
        }

        // Listen for contract events
        listenForEvents();

    } catch (error) {
        handleError(error);
    }
}

// Listen for contract events
function listenForEvents() {
    contract.events.TicketPurchased({}, (error, event) => {
        if (!error) {
            displayEventAlert(`Ticket purchased! Category: ${event.returnValues.category}, Buyer: ${event.returnValues.buyer}`);
        }
    });

    contract.events.LotteryWinner({}, (error, event) => {
        if (!error) {
            displayEventAlert(`We have a winner! Category: ${event.returnValues.category}, Winner: ${event.returnValues.winner}, Prize: ${web3.utils.fromWei(event.returnValues.prizeAmount, 'ether')} USDT`);
        }
    });
}

// Display event alerts in the alert list
function displayEventAlert(message) {
    const alertList = document.getElementById('alert-list');
    const newAlert = document.createElement('li');
    newAlert.innerText = message;
    alertList.appendChild(newAlert);
}

// Handle errors
function handleError(error) {
    let errorMsg = "Unknown error.";
    if (error.message.includes("insufficient funds")) {
        errorMsg = "Insufficient funds. Please ensure you have enough USDT.";
    } else if (error.message.includes("user rejected")) {
        errorMsg = "Transaction rejected. Please approve the transaction.";
    } else if (error.message.includes("invalid network")) {
        errorMsg = "Invalid network. Please connect to Arbitrum One.";
    } else if (error.message.includes("revert")) {
        errorMsg = "Transaction reverted. Please check the ticket category or allowance.";
    }
    document.getElementById('error-text').innerText = errorMsg;
}

// Connect wallet button event
document.getElementById('connect-wallet').addEventListener('click', init);

// Buy ticket button event
document.querySelectorAll('.buy-ticket').forEach(button => {
    button.addEventListener('click', async (event) => {
        try {
            const category = event.target.parentElement.getAttribute('data-category');
            const ticketPrices = {
                1: web3.utils.toWei("1.2", "ether"),
                2: web3.utils.toWei("10.2", "ether"),
                3: web3.utils.toWei("100.2", "ether"),
            };
            const ticketPrice = ticketPrices[category];
            const allowance = await usdtContract.methods.allowance(userAddress, contractAddress).call();
            if (BigInt(allowance) < BigInt(ticketPrice)) {
                document.getElementById('error-text').innerText = "Insufficient allowance. Please approve the contract to spend USDT.";
                return;
            }

            await contract.methods.buyTicket(category, '0x0000000000000000000000000000000000000000').send({ from: userAddress });
            alert("Ticket purchased successfully!");
        } catch (error) {
            handleError(error);
        }
    });
});
