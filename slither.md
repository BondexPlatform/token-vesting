
## incorrect-equality
Impact: Medium
Confidence: High
 - [ ] ID-0
[Vesting.claim()](contracts/Vesting.sol#L91-L109) uses a dangerous strict equality:
	- [amount == 0](contracts/Vesting.sol#L100)

contracts/Vesting.sol#L91-L109


 - [ ] ID-1
[Vesting.__Vesting_init_unchained(IVesting.VestingConfig)](contracts/Vesting.sol#L48-L86) uses a dangerous strict equality:
	- [config.totalAmount == 0](contracts/Vesting.sol#L81)

contracts/Vesting.sol#L48-L86


## shadowing-local
Impact: Low
Confidence: High
 - [ ] ID-2
[IVesting.initialize(IVesting.VestingConfig).config](contracts/interfaces/IVesting.sol#L29) shadows:
	- [IVesting.config()](contracts/interfaces/IVesting.sol#L35) (function)

contracts/interfaces/IVesting.sol#L29


 - [ ] ID-3
[Vesting.__Vesting_init_unchained(IVesting.VestingConfig).config](contracts/Vesting.sol#L49) shadows:
	- [StorageVesting.config()](contracts/storage/StorageVesting.sol#L27-L29) (function)
	- [IVesting.config()](contracts/interfaces/IVesting.sol#L35) (function)

contracts/Vesting.sol#L49


 - [ ] ID-4
[Vesting.getClaimableAmount().amountClaimed](contracts/Vesting.sol#L123) shadows:
	- [StorageVesting.amountClaimed()](contracts/storage/StorageVesting.sol#L31-L33) (function)
	- [IVesting.amountClaimed()](contracts/interfaces/IVesting.sol#L37) (function)

contracts/Vesting.sol#L123


 - [ ] ID-5
[Vesting.initialize(IVesting.VestingConfig).config](contracts/Vesting.sol#L29) shadows:
	- [StorageVesting.config()](contracts/storage/StorageVesting.sol#L27-L29) (function)
	- [IVesting.config()](contracts/interfaces/IVesting.sol#L35) (function)

contracts/Vesting.sol#L29


 - [ ] ID-6
[Vesting.__Vesting_init(IVesting.VestingConfig).config](contracts/Vesting.sol#L35) shadows:
	- [StorageVesting.config()](contracts/storage/StorageVesting.sol#L27-L29) (function)
	- [IVesting.config()](contracts/interfaces/IVesting.sol#L35) (function)

contracts/Vesting.sol#L35


## reentrancy-benign
Impact: Low
Confidence: Medium
 - [ ] ID-7
Reentrancy in [VestingFactory.deploy(IVesting.VestingConfig)](contracts/VestingFactory.sol#L41-L50):
	External calls:
	- [IVesting(vesting).initialize(config)](contracts/VestingFactory.sol#L45)
	State variables written after the call(s):
	- [deployments[config.claimant].push(vesting)](contracts/VestingFactory.sol#L47)

contracts/VestingFactory.sol#L41-L50


## reentrancy-events
Impact: Low
Confidence: Medium
 - [ ] ID-8
Reentrancy in [Vesting.claim()](contracts/Vesting.sol#L91-L109):
	External calls:
	- [$.config.token.safeTransfer($.config.claimant,amount)](contracts/Vesting.sol#L106)
	Event emitted after the call(s):
	- [Claimed(amount)](contracts/Vesting.sol#L108)

contracts/Vesting.sol#L91-L109


## timestamp
Impact: Low
Confidence: Medium
 - [ ] ID-9
[Vesting.getClaimableAmount()](contracts/Vesting.sol#L116-L155) uses timestamp for comparisons
	Dangerous comparisons:
	- [block.timestamp < $.config.tgeTime](contracts/Vesting.sol#L119)
	- [$.config.tgeTime + $.config.cliffDuration < block.timestamp](contracts/Vesting.sol#L138)
	- [timePassed >= $.config.vestingDuration](contracts/Vesting.sol#L143)

contracts/Vesting.sol#L116-L155


 - [ ] ID-10
[Vesting.claim()](contracts/Vesting.sol#L91-L109) uses timestamp for comparisons
	Dangerous comparisons:
	- [amount == 0](contracts/Vesting.sol#L100)

contracts/Vesting.sol#L91-L109


 - [ ] ID-11
[Vesting.__Vesting_init_unchained(IVesting.VestingConfig)](contracts/Vesting.sol#L48-L86) uses timestamp for comparisons
	Dangerous comparisons:
	- [config.tgeTime + config.cliffDuration + config.vestingDuration < block.timestamp](contracts/Vesting.sol#L71-L72)
	- [config.tgePercentage > 100 * (10 ** PERCENTAGE_DECIMALS)](contracts/Vesting.sol#L77)
	- [config.totalAmount == 0](contracts/Vesting.sol#L81)

contracts/Vesting.sol#L48-L86


## assembly
Impact: Informational
Confidence: High
 - [ ] ID-12
[StorageVesting._getVestingStorage()](contracts/storage/StorageVesting.sol#L17-L25) uses assembly
	- [INLINE ASM](contracts/storage/StorageVesting.sol#L22-L24)

contracts/storage/StorageVesting.sol#L17-L25

## naming-convention
Impact: Informational
Confidence: High

 - [ ] ID-13
Function [Vesting.__Vesting_init(IVesting.VestingConfig)](contracts/Vesting.sol#L34-L38) is not in mixedCase

contracts/Vesting.sol#L34-L38

 - [ ] ID-14
Function [Vesting.__Vesting_init_unchained(IVesting.VestingConfig)](contracts/Vesting.sol#L48-L86) is not in mixedCase

contracts/Vesting.sol#L48-L86


 - [ ] ID-15
Constant [StorageVesting.VestingStorageLocation](contracts/storage/StorageVesting.sol#L14-L15) is not in UPPER_CASE_WITH_UNDERSCORES

contracts/storage/StorageVesting.sol#L14-L15
