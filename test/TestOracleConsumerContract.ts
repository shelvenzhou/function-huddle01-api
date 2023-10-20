import { expect } from "chai";
import { type Contract, type Event } from "ethers";
import { ethers } from "hardhat";
import { execSync } from "child_process";

async function waitForResponse(consumer: Contract, event: Event) {
  const [, data] = event.args!;
  // Run Phat Function
  const result = execSync(`phat-fn run --json dist/index.js -a ${data} {\\"apiKey\\":\\"test\\"}`).toString();
  // console.log(`Oracle result: ${result}`);
  const json = JSON.parse(result);
  const action = ethers.utils.hexlify(ethers.utils.concat([
    new Uint8Array([0]),
    json.output,
  ]));
  // Make a response
  const tx = await consumer.rollupU256CondEq(
    // cond
    [],
    [],
    // updates
    [],
    [],
    // actions
    [action],
  );
  const receipt = await tx.wait();
  return receipt.events;
}

describe("OracleConsumerContract.sol", function () {
  it("Push and receive message", async function () {
    // Deploy the contract
    const [deployer] = await ethers.getSigners();
    const TestOracleConsumerContract = await ethers.getContractFactory("OracleConsumerContract");
    const consumer = await TestOracleConsumerContract.deploy(deployer.address);

    // Make a request
    const meetingId = "03dec8c8-ad63-4f3a-9615-0a2b0049790d";
    const tx = await consumer.requestMeetingAirdrop(meetingId);
    const receipt = await tx.wait();
    const reqEvents = receipt.events;
    expect(reqEvents![0]).to.have.property("event", "MessageQueued");

    // Wait for Phat Contract response
    const respEvents = await waitForResponse(consumer, reqEvents![0])
    // console.log(`${JSON.stringify(respEvents)}`);

    // Check response data
    expect(respEvents[0]).to.have.property("event", "Transfer");
    expect(respEvents[1]).to.have.property("event", "Transfer");
    expect(respEvents[2]).to.have.property("event", "ResponseReceived");
    const [reqId, pair, value] = respEvents[2].args;
    expect(ethers.BigNumber.isBigNumber(reqId)).to.be.true;
    expect(pair).to.equal(meetingId);
    expect(ethers.BigNumber.isBigNumber(value)).to.be.true;
  });
});
