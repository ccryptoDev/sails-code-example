/**
 * AchController
 *
 * @description :: Server-side logic for managing Ach details
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
*/

var request = require('request'),
	moment = require('moment'),
	_ = require('lodash'),
	Q = require('q');
var in_array = require('in_array');
var ObjectId = require('mongodb').ObjectID;
var path = require('path')

var fs = require('fs');

module.exports = {
	showAllPendingAch: showAllPendingAchAction,
	updateEmployee: updateEmployee,
	ajaxPendingAch: ajaxPendingAchAction,
	ajaxPaymentHistory: ajaxPaymentHistoryAction,
	getAchUserDetails: getAchUserDetailsAction,
	denyUserLoan: denyUserLoanAction,
	addAchComments: addAchCommentsAction,
	addnewCustomer: addnewCustomerAction,
	addnewBankaccount: addnewBankaccountAction,
	loanproCreditPayment: loanproCreditPaymentAction,
	checkAchTransactionDetails: checkAchTransactionDetailsAction,
	ajaxAchComments: ajaxAchCommentsAction,
	uploadDocumentProof: uploadDocumentProofAction,
	defaultUsers: defaultUsersAction,
	ajaxDefaultUsersList: ajaxDefaultUsersListAction,
	viewDefaultUser: viewDefaultUserAction,
	showAllComplete: showAllCompleteAction,
	completeApplication: completeApplication,
	addchargeoff: addchargeoffAction,
	showAllBlocked: showAllBlockedAction,
	ajaxBlockedAch: ajaxBlockedAchAction,
	releaseApp: releaseAppAction,
	approveUserLoan: approveUserLoanAction,
	sendAddBankInvite: sendAddBankInvite,
	manageReconciliation: manageReconciliationAction,
	ajaxReconciliationList: ajaxReconciliationList,
	showAllDenied: showAllDeniedAction,
	ajaxDeniedApplication: ajaxDeniedApplicationAction,
	viewreconciliationDetails: viewreconciliationDetails,
	storyUserviewinfo: storyUserviewinfo,
	incompleteUploadDocumentProof: incompleteUploadDocumentProofAction,
	userPaymentHistory: userPaymentHistoryAction,
	cancelAch: cancelAchAction,
	repullPayment: repullPayment,
	showPotentialDefaultusers: showPotentialDefaultusers,
	ajaxPotentialDefaultusers: ajaxPotentialDefaultusers,
	approvePatientloan: approvePatientloanAction,
	updateSetDate: updateSetDateAction,
	updatePreferredDate: updatePreferredDateAction,
	updatePatientloanstartdate: updatePatientloanstartdateAction,
	linkdoctorstaff: linkdoctorstaffAction,
	showAllInprogress: showAllInprogressAction,
	showFundedContracts: showFundedContracts,
	showAllArchivedDenied: showAllArchivedDeniedAction,
	showAllArchivedPendingAch: showAllArchivedPendingAchAction,
	movetoopenupdate: movetoopenupdateAction,
	showAllToDoItemsPendingAch: showAllToDoItemsPendingAchAction,
	showAllToDoItemsDenied: showAllToDoItemsDeniedAction,
	showProcedureDateSet: showProcedureDateSetAction,
	markAsReviewed: markAsReviewedAction,
	showAllToDoItemsOpenApplication: showAllToDoItemsOpenApplicationAction,
	showAllArchivedOpenAch: showAllArchivedOpenAchAction,
	showAllOpenApplicationAch: showAllOpenApplicationAchAction,
	showInCompleteApplicationAch: showInCompleteApplicationAch,
	ajaxOpenApplicationAch: ajaxOpenApplicationAchAction,
	movetoUnarchive: movetoUnarchiveAction,
	providerlist: providerlistAction,
	ajaxProvider: ajaxProviderAction,
	confirmProcedure: confirmProcedure,
	resetToPendingState: resetToPendingState
};

function executeBTRs(assetReport) {
	let rules = {};
	//rule e_r_1  
	let income_list = ['PAYROLL',
		'ANNUITY',
		'DIRECT DEP',
		'DIRECT DEPOSIT',
		'DIRECT DEP',
		'DIRDEP',
		'DIRÂ DEP',
		'DIR DEP',
		'DIRECT DEP',
		'SALARY',
		'PAYCHECK',
		'BRANCH DEPOSIT INCOME',
		'ATM DEPOSIT INCOME',
		'MOBILE DEPOSIT INCOME',
		'BRANCH DEPOSIT WITH HOLD INCOME',
		'INCOME - PAYCHECK',
		'PROMOTION BONUS',
		'ALLOWANCE',
		'DIVIDEND'
	];

	let exclude_list = ['BANKING PAYMENT',
		'ONLINE PAYMENT',
		'CREDIT CARD PAYMENT'
	];

	let category_list = ['Tax|Refund', 'Transfer|Payroll', 'Transfer|Payroll|Benefits'];

	let income_6mon_amount = 0;
	let income_6mon_avg;
	_.forEach(assetReport.report.items, (item) => {
		_.forEach(item.accounts, (bankaccount) => {
			_.forEach(bankaccount.transactions, (transaction) => {

				let trans_since_app = moment().diff(moment(transaction.date), 'months', true);
				let trans_name = transaction.name.toUpperCase();
				let trans_description = transaction.original_description.toUpperCase();
				let trans_category = transaction.category.join('|');

				if (transaction.amount < -5 && trans_since_app <= 6 &&
					((category_list.includes(trans_category) == true && exclude_list.includes(trans_name) == false)
						|| (income_list.includes(trans_name) || income_list.includes(trans_description)))) {

					income_6mon_amount += parseFloat(transaction.amount);

				}
			})

		})
	});
	income_6mon_avg = income_6mon_amount / 6;
	rules.btr1 = { passed: income_6mon_avg < 2000 ? false : true, value: income_6mon_avg.toFixed(2) };
	// rule e_r_1: if income_6mon_avg < 2000  then e_r_1 = 1 else e_r_1  = 0;

	let NSF_list = ['OVERDRAFT', 'INSUFFICIENT', ' OD FEE', ' NSF'];
	let overdraft_list = ['Bank Fees, Insufficient Funds', 'Bank Fees, Overdraft'];

	// rule e_r_2

	let nsf_in_1m_cnt = 0;
	_.forEach(assetReport.report.items, (item) => {
		_.forEach(item.accounts, (bankaccount) => {
			_.forEach(bankaccount.transactions, (transaction) => {

				let trans_since_app = moment().diff(moment(transaction.date), 'months', true);
				let trans_name = transaction.name.toUpperCase();
				let trans_description = transaction.original_description.toUpperCase();
				let trans_category = transaction.category.join('|');

				if (transaction.amount > 0 && trans_since_app <= 1 &&
					(NSF_list.includes(trans_name) == true || NSF_list.includes(trans_description) == true || overdraft_list.indexOf(trans_category) > -1)) {
					nsf_in_1m_cnt += 1;

				}
			})

		})
	});    // e_r_2: if nsf_in_1m_cnt > 0  then e_r_2 = 1 else e_r_2 = 0;
	rules.btr2 = { passed: nsf_in_1m_cnt > 0 ? false : true, value: nsf_in_1m_cnt.toFixed(2) };

	//rule e_r_3
	let nsf_in_3m_cnt = 0;
	_.forEach(assetReport.report.items, (item) => {
		_.forEach(item.accounts, (bankaccount) => {
			_.forEach(bankaccount.transactions, (transaction) => {

				let trans_since_app = moment().diff(moment(transaction.date), 'months', true);
				let trans_name = transaction.name.toUpperCase();
				let trans_description = transaction.original_description.toUpperCase();
				let trans_category = transaction.category.join('|');

				if (transaction.amount > 0 && trans_since_app <= 3 &&
					(NSF_list.includes(trans_name) == true || NSF_list.includes(trans_description) == true || overdraft_list.indexOf(trans_category) > -1)) {
					nsf_in_3m_cnt += 1;

				}
			})

		})
	});    // e_r_3: if nsf_in_3m_cnt > 2  then e_r_3 = 1 else e_r_3 = 0;
	rules.btr3 = { passed: nsf_in_3m_cnt > 2 ? false : true, value: nsf_in_3m_cnt.toFixed(2) };

	// rule e_r_4
	let avg_depository_6mon = 0;
	let depository_6mon_cnt = 0;
	let depository_6mon_amt = 0;

	_.forEach(assetReport.report.items, (item) => {
		_.forEach(item.accounts, (bankaccount) => {

			if (bankaccount.type == 'depository') {

				_.forEach(bankaccount.historical_balances, (balance) => {

					let bal_since_app = moment().diff(moment(balance.date), 'months', true);

					if (bal_since_app <= 6) {

						depository_6mon_amt += parseFloat(balance.current);
						depository_6mon_cnt += 1;
					}
				})
			}
		})
	});

	avg_depository_6mon = depository_6mon_amt / depository_6mon_cnt;
	rules.btr4 = { passed: avg_depository_6mon <= 400 ? false : true, value: (!Number.isNaN(avg_depository_6mon) ? avg_depository_6mon.toFixed(2) : 0.00) };
	// e_r_4: if avg_depository_6mon <= 400 then e_r_4 = 1 else e_r_4 = 0;

	// rule e_r_5
	let bal_avail_depository = 0;
	_.forEach(assetReport.report.items, (item) => {
		_.forEach(item.accounts, (bankaccount) => {
			if (bankaccount.type == "depository") {

				bal_avail_depository += parseFloat(bankaccount.balances.available);

			}

		});
	}); // e_r_5: if e_r_5 <= 200 then e_r_5 = 1 else e_r_5 = 0;
	rules.btr5 = { passed: bal_avail_depository <= 200 ? false : true, value: (!Number.isNaN(bal_avail_depository) ? bal_avail_depository.toFixed(2) : 0.00) };

	//rule mh_r_1

	let positive_days_depository_1mon = 0;
	_.forEach(assetReport.report.items, (item) => {
		_.forEach(item.accounts, (bankaccount) => {

			if (bankaccount.type == 'depository') {

				_.forEach(bankaccount.historical_balances, (balance) => {

					let bal_since_app = moment().diff(moment(balance.date), 'months', true);

					if (bal_since_app <= 1 && balance.current > 0) {

						positive_days_depository_1mon += 1;

					}
				})
			}
		})
	}); //mh_r_1: if bal_avail_depository < 50 && bal_avail_depository is not missing && positive_days_depository_1mon < 20 && 
	// positive_days_depository_1mon is not missing then mh_r_1 = 1 else mh_r_1 = 0;
	rules.btr6 = { passed: (bal_avail_depository < 50 && bal_avail_depository && positive_days_depository_1mon < 20 && positive_days_depository_1mon) ? false : true, value: (!Number.isNaN(bal_avail_depository) ? bal_avail_depository.toFixed(2) : 0.00) };

	// rule mh_r_2

	let avg_depository_3mon = 0;
	let depository_3mon_cnt = 0;
	let depository_3mon_amt = 0;

	_.forEach(assetReport.report.items, (item) => {
		_.forEach(item.accounts, (bankaccount) => {

			if (bankaccount.type == 'depository') {

				_.forEach(bankaccount.historical_balances, (balance) => {

					let bal_since_app = moment().diff(moment(balance.date), 'months', true);

					if (bal_since_app <= 3) {

						depository_3mon_amt += parseFloat(balance.current);
						depository_3mon_cnt += 1;
					}
				})
			}
		})
	});

	avg_depository_3mon = depository_3mon_amt / depository_3mon_cnt;

	let avg_credit_3mon = 0;
	let credit_3mon_cnt = 0;
	let credit_3mon_amt = 0;

	_.forEach(assetReport.report.items, (item) => {
		_.forEach(item.accounts, (bankaccount) => {

			if (bankaccount.type == 'credit') {

				_.forEach(bankaccount.historical_balances, (balance) => {

					let bal_since_app = moment().diff(moment(balance.date), 'months', true);

					if (bal_since_app <= 3) {

						credit_3mon_amt += parseFloat(balance.current);
						credit_3mon_cnt += 1;
					}
				})
			}
		})
	});

	avg_credit_3mon = credit_3mon_amt / credit_3mon_cnt;

	//mh_r_2: if avg_depository_3mon < 200 && avg_depository_3mon is not missing && avg_credit_3mon > 500 &&
	// avg_credit_3mon is not missing then mh_r_2 = 1 else mh_r_2 = 0;

	rules.btr7 = { passed: (avg_depository_3mon < 200 && avg_depository_3mon && avg_credit_3mon > 500 && avg_credit_3mon) ? false : true, value: (!Number.isNaN(avg_depository_3mon) ? avg_depository_3mon.toFixed(2) : 0.00) };

	// rule mh_r_3
	// if income_6mon_amount < 1000 && income_6mon_amount is not missing then mh_r_3 = 1 else mh_r_3 = 0;
	rules.btr8 = { passed: (income_6mon_amount < 1000 && income_6mon_amount) ? false : true, value: income_6mon_amount.toFixed(2) };

	// rule mh_r_4
	var trans_dates = [];
	var days_since_old_trans;

	_.forEach(assetReport.report.items, (item) => {
		_.forEach(item.accounts, (bankaccount) => {
			_.forEach(bankaccount.transactions, (transaction) => {

				trans_dates.push(transaction.date);

			})

		})
	});
	
	try {
		let max_trans_date = trans_dates.reduce(function (a, b) { return a < b ? a : b; }); // find the oldest date
		days_since_old_trans = moment().diff(moment(max_trans_date), 'days', true);
	} catch (e) {
		days_since_old_trans = 0;
	}

	pdl_list = ['RISE DE II DB',
		'ONE MAIN FINANCIAL',
		'ONE MAIN PAY',
		'CREDITBOX',
		'RSVP LOANS',
		'ELASTIC',
		'PLAIN GREEN',
		'AMPLIFY',
		'CASHNETUSA',
		'SPEEDY',
		'AUTOSAVE PAYDAY',
		'SC CAROLINA PAYDAY',
		'CASHBACK PAYDAY',
		'USA PAYDAY',
		'REAL PAYDAY LOAN',
		'GULF PAYDAY',
		'PAYDAY MONEY CENTERS',
		'FAST PAYDAY LOAN',
		'SOUTHERN PAYDAY',
		'PAYDAYHAWAII',
		'PAYDAY24NOW',
		'PAYDAY MONEY STORE',
		'PAYDAY ONE',
		'PAYDAY LOAN STORE',
		'PAYDAY EXP',
		'CASH ADVANCE',
		'MONEYKEY',
		'BLUE TRUST',
		'ACE CASH EXPRESS',
		'CHECK INTO CASH',
		'CHECK CITY',
		'MONEYLION',
		'CASH CENTRAL',
		'CHECK N GO',
		'MONEY TREE',
		'LENDUP',
		'ADVANCE AMERICA',
		'MOBILOANS',
		'LOANME',
		'OPPORTUNITY FINA',
		'CREDITNINJA',
		'FIG LOAN',
		'BIG PICTURE LOAN',
		'500FASTCASH',
		'WALLACE',
		'CHECK ADVANCE USA',
		'CASH FACTORY',
		'POWER FINANCE',
		'ARROWHEAD'
	];

	let deposit_1mon_amt = 0;
	_.forEach(assetReport.report.items, (item) => {
		_.forEach(item.accounts, (bankaccount) => {
			_.forEach(bankaccount.transactions, (transaction) => {

				let trans_since_app = moment().diff(moment(transaction.date), 'months', true);
				let trans_name = transaction.name.toUpperCase();
				let trans_description = transaction.original_description.toUpperCase();

				if (transaction.amount < -5 && trans_since_app <= 1 && pdl_list.includes(trans_name) && pdl_list.includes(trans_description)) {

					deposit_1mon_amt += parseFloat(transaction.amount);
				}
			})

		})
	});
	//mh_r_4: if days_since_old_trans < 180 && days_since_old_trans is not missing && deposit_1mon_amt < -500 && deposit_1mon_amt is not missing then mh_r_4 = 1 else mh_r_4 = 0;
	sails.log.warn('btr9', (days_since_old_trans < 180 && days_since_old_trans && deposit_1mon_amt < -500 && deposit_1mon_amt))
	rules.btr9 = { passed: (days_since_old_trans < 180 && days_since_old_trans && deposit_1mon_amt < -500 && deposit_1mon_amt) ? false : true, value: days_since_old_trans.toFixed(2) };

	// rule g_r_1
	let ck_acc_bal_avg = 0;
	let ck_acc_bal_sum;
	let ck_acc_bal_cnt;


	_.forEach(assetReport.report.items, (item) => {
		_.forEach(item.accounts, (bankaccount) => {
			if (bankaccount.type == "checking") {

				ck_acc_bal_sum += parseFloat(bankaccount.balances.available);
				ck_acc_bal_cnt += 1;
			}

		});
	});

	ck_acc_bal_avg = ck_acc_bal_sum / ck_acc_bal_cnt;
	//g_r_1: if ck_acc_bal_avg is missing or ck_acc_bal_avg <-1000 then g_r_1 =1 else g_r_1 = 0;
	rules.btr10 = { passed: (!ck_acc_bal_avg || ck_acc_bal_avg < -1000) ? false : true, value: (!Number.isNaN(ck_acc_bal_avg) ? ck_acc_bal_avg.toFixed(2) : 0.00) };

	// rule g_r_3

	let payment_amt_90d = 0;

	_.forEach(assetReport.report.items, (item) => {
		_.forEach(item.accounts, (bankaccount) => {
			_.forEach(bankaccount.transactions, (transaction) => {

				let category = Math.floor(parseFloat((transaction.category_id) / 1000000)); // eg: cast 17018000 into 17
				let trans_since_app = moment().diff(moment(transaction.date), 'days', true);

				if (category == 16 && trans_since_app <= 90) {
					payment_amt_90d += transaction.amount;

				}
			})

		})
	});    //g_r_3: if payment_amt_90d <50 and payment_amt_90d is not missing then g_r_3 = 1 else g_r_3 = 0;
	rules.btr11 = { passed: (payment_amt_90d < 50 && payment_amt_90d) ? false : true, value: payment_amt_90d.toFixed(2) };

	// rule g_r_4

	let spd_pos_cnt_30d = 0;
	let spd_list = [12, 13, 14, 17, 18, 19, 22];

	_.forEach(assetReport.report.items, (item) => {
		_.forEach(item.accounts, (bankaccount) => {
			_.forEach(bankaccount.transactions, (transaction) => {

				let category = Math.floor(parseFloat((transaction.category_id) / 1000000)); // eg: cast 17018000 into 17
				let trans_since_app = moment().diff(moment(transaction.date), 'days', true);

				if (spd_list.includes(category) == true && trans_since_app <= 30 && transaction.amount > 0) {
					spd_pos_cnt_30d += 1;

				}
			})

		})
	});  //spd_pos_cnt_30d: if spd_pos_cnt_30d <3 or spd_pos_cnt_30d is missing then rule g_r_4 = 1 else rule g_r_4 = 0;
	rules.btr12 = { passed: (spd_pos_cnt_30d < 3 || !spd_pos_cnt_30d) ? false : true, value: spd_pos_cnt_30d.toFixed(2) };

	// rule g_r_5

	let bkf_cnt_90d = 0;
	let bkf_amt_90d = 0;

	_.forEach(assetReport.report.items, (item) => {
		_.forEach(item.accounts, (bankaccount) => {
			_.forEach(bankaccount.transactions, (transaction) => {

				let category = Math.floor(parseFloat((transaction.category_id) / 1000000)); // eg: cast 17018000 into 17
				let trans_since_app = moment().diff(moment(transaction.date), 'days', true);

				if (category == 10 && trans_since_app <= 90) {
					bkf_cnt_90d += 1;
					bkf_amt_90d += transaction.amount;

				}
			})

		})
	});  //g_r_5: if bkf_cnt_90d <20 or bkf_amt_90d > 1000 then rule g_r_5 = 1 else rule g_r_5 = 0;
	rules.btr13 = { passed: (bkf_cnt_90d < 20 || bkf_amt_90d > 1000) ? false : true, value: bkf_cnt_90d.toFixed(2) };

	// rule g_r_6

	let checking1_gap_max_pct = 0;
	var dict = {};
	let trans_max_gap = 0;
	let trans_length = 0;
	let trans_cnt = 0;
	let trans_list = [];
	let checking_cnt = 0;

	_.forEach(assetReport.report.items, (item) => {
		_.forEach(item.accounts, (bankaccount) => {
			if (bankaccount.subtype == 'checking') {

				_.forEach(bankaccount.transactions, (transaction) => {

					trans_list.push(transaction.date);

				})

				let trans_list_sort = trans_list.sort(function (a, b) { return b - a }) // sort dates list in a descending way
				trans_cnt = trans_list.length;
				trans_length = moment(trans_list_sort[0]).diff(moment(trans_list_sort[-1]), 'days', true); // get longest days difference from transaction dates
				// define a function getMax to find maximum days between two transaction dates (next to each other) in array trans_list_sort
				// eg: ['2021-1-9','2021-1-7','2021-1-4','2021-1-3','2021-1-1'] will return 3 days
				trans_max_gap = 30;
				checking1_gap_max_pct = trans_max_gap / trans_length; // round to 2 decimal

				checking_cnt += 1;
				dict['checking_' + checking_cnt.toString()] = [trans_cnt, checking1_gap_max_pct]; // skip the duplicate trans_length
			}

		})
	});

	for (let m in dict) {

		// find the largest trans_cnt, then return the cresponding checking1_gap_max_pct

	};
	rules.btr14 = { passed: (checking1_gap_max_pct > 0.1) ? false : true, value: checking1_gap_max_pct.toFixed(2) };

	//g_r_6: if checking1_gap_max_pct > 0.1 then g_r_6 = 1 else g_r_6 = 0;
	sails.log.warn("BankTransactionRules: ", rules);
	return rules;
}

function updateEmployee(req, res) {
	const reqParams = req.allParams();
	const userId = _.get(reqParams, "id", null);
	if (!userId) {
		sails.log.error("updateEmployee; missing id:", reqParams);
		return res.badRequest({ code: 400, message: "Bad Request" });
	}
	const data = {
		currentIncome: reqParams.currentIncome.trim(),
		employerAddress: reqParams.employerAddress.trim(),
		employerCity: reqParams.employerCity.trim(),
		employerName: reqParams.employerName.trim(),
		employerPhone: reqParams.employerPhone.trim(),
		employerState: reqParams.employerState,
		employerZip: reqParams.employerZip,
		isAfterHoliday: reqParams.isAfterHoliday,
		lastPayDate: reqParams.lastPayDate,
		nextPayDate: reqParams.nextPayDate,
		secondPayDate: reqParams.secondPayDate,
		payFrequency: reqParams.payFrequency,
		paymentmanagement: reqParams.paymentmanagement,
		periodicity: reqParams.periodicity,
		secondPayDate: reqParams.secondPayDate,
		typeOfIncome: reqParams.typeOfIncome,
		typeOfPayroll: reqParams.typeOfPayroll
	}
	return EmploymentHistory.update({ user: userId }, data)
		.then((results) => {
			res.status(200).json(results);
			return;
		})
		.catch(() => {
			return res.badRequest({ code: 400, message: "Bad Request" });
		});
}

function setupRequestDataForDataTableList(req) {
	var errorval = '';
	var successval = '';
	var newLoanupdateSuccessMsg = '';
	var newLoanupdateMsg = '';
	if (req.session.approveerror !== '') {
		errorval = req.session.approveerror;
		req.session.approveerror = '';
	}
	if (req.session.successmsg !== '') {
		successval = req.session.successmsg;
		req.session.successmsg = '';
	}
	if ("undefined" !== typeof req.session.newLoanupdateSuccessMsg && req.session.newLoanupdateSuccessMsg !== '' && req.session.newLoanupdateSuccessMsg != null) {
		newLoanupdateSuccessMsg = req.session.newLoanupdateSuccessMsg;
		req.session.newLoanupdateSuccessMsg = '';
	}
	if ("undefined" !== typeof req.session.newLoanupdateMsg && req.session.newLoanupdateMsg !== '' && req.session.newLoanupdateMsg != null) {
		newLoanupdateMsg = req.session.newLoanupdateMsg;
		req.session.newLoanupdateMsg = '';
	}

	//req.session.viewType = 'open';
	return responsedata = {
		approveerror: errorval,
		approvesuccess: successval,
		newLoanupdateMsg: newLoanupdateMsg,
		newLoanupdateSuccessMsg: newLoanupdateSuccessMsg
	};
}
function showAllPendingAchAction(req, res) {
	res.view("admin/pendingach/pendingachList", setupRequestDataForDataTableList(req));
}

function showAllOpenApplicationAchAction(req, res) {
	const responseData = _.assign({}, setupRequestDataForDataTableList(req), { viewStatus: "Pending" });
	res.view("admin/pendingach/OpenAchList", responseData);
}
function showInCompleteApplicationAch(req, res) {
	const responseData = _.assign({}, setupRequestDataForDataTableList(req), { viewStatus: "Incomplete" });
	res.view("admin/pendingach/openIncompleteList", responseData);
}

function showAllArchivedPendingAchAction(req, res) {
	res.view("admin/pendingach/pendingArchivedachList", setupRequestDataForDataTableList(req));
}

function showAllArchivedOpenAchAction(req, res) {
	res.view("admin/pendingach/openApplicationArchivedList", setupRequestDataForDataTableList(req));
}

function showAllToDoItemsPendingAchAction(req, res) {
	res.view("admin/pendingach/pendingToDoItemachList", setupRequestDataForDataTableList(req));
}


function showAllToDoItemsOpenApplicationAction(req, res) {
	res.view("admin/pendingach/openApplicationToDoItemList", setupRequestDataForDataTableList(req));
}

function ajaxPaymentHistoryAction(req, res) {
	//add(1, 'days')
	var startDate = moment().tz("America/los_angeles").format('YYYY-MM-DD');


	//Sorting
	var colS = "";

	if (req.query.sSortDir_0 == 'desc') {
		sorttype = -1;
	}
	else {
		sorttype = 1;
	}
	switch (req.query.iSortCol_0) {
		case '0': var sorttypevalue = { '_id': sorttype }; break;
		case '1': var sorttypevalue = { 'uniqueID': sorttype }; break;
		case '2': var sorttypevalue = { 'consumerName': sorttype }; break;
		case '3': var sorttypevalue = { 'amount': sorttype }; break;
		case '4': var sorttypevalue = { 'scheduleDate': sorttype }; break;
		case '5': var sorttypevalue = { 'lenderType': sorttype }; break;
		case '6': var sorttypevalue = { 'status': sorttype }; break;
		case '7': var sorttypevalue = { 'rejectReason': sorttype }; break;
		default: break;
	};


	//Search

	var criteria = new Array();
	var whereConditionAnd = new Array();
	var whereConditionOr = new Array();
	if ((req.query.scheduleStartDate != '') && (typeof (req.query.scheduleStartDate) != 'undefined')) {
		var scheduleStartDate = moment(req.query.scheduleStartDate).format('YYYY-MM-DD');
	}
	if ((req.query.scheduleEndDate != '') && (typeof (req.query.scheduleEndDate) != 'undefined')) {
		var scheduleEndDate = moment(req.query.scheduleEndDate).format('YYYY-MM-DD');
	}


	if (((req.query.scheduleStartDate != '') && (typeof (req.query.scheduleStartDate) != 'undefined')) && ((req.query.scheduleEndDate != '') && (typeof (req.query.scheduleEndDate) != 'undefined'))) {
		whereConditionAnd.push({ scheduleDate: { "$gte": new Date(scheduleStartDate) } });
		whereConditionAnd.push({ scheduleDate: { "$lte": new Date(scheduleEndDate) } });
	} else if ((req.query.scheduleStartDate != '') && (typeof (req.query.scheduleStartDate) != 'undefined')) {
		whereConditionAnd.push({ scheduleDate: { "$gte": new Date(scheduleStartDate) } });
	} else if ((req.query.scheduleEndDate != '') && (typeof (req.query.scheduleEndDate) != 'undefined')) {
		whereConditionAnd.push({ scheduleDate: { "$lte": new Date(scheduleEndDate) } });
	} else {
		whereConditionAnd.push({ scheduleDate: { "$lte": new Date(startDate) } });
	}

	if ((req.query.processTypeVal != '') && (typeof (req.query.processTypeVal) != 'undefined')) {
		whereConditionAnd.push({ "processType": req.query.processTypeVal });
	}/*else{
		whereConditionAnd.push({"processType":  1});
	}*/

	if ((req.query.lenderTypeVal != '') && (typeof (req.query.lenderTypeVal) != 'undefined')) {
		whereConditionAnd.push({ "lenderType": req.query.lenderTypeVal });
	}
	if (req.query.sSearch) {
		whereConditionOr.push({ uniqueID: { 'contains': req.query.sSearch } });
		whereConditionOr.push({ consumerName: { 'contains': req.query.sSearch } });
		whereConditionOr.push({ amount: { 'contains': req.query.sSearch } });
		whereConditionOr.push({ lenderType: { 'contains': req.query.sSearch } });
		whereConditionOr.push({ scheduleDate: { 'contains': req.query.sSearch } });
		whereConditionOr.push({ status: { 'contains': req.query.sSearch } });
	}
	if (whereConditionOr.length > 0) {
		criteria.push({ $and: whereConditionAnd, $or: whereConditionOr });
	} else {
		criteria.push({ $and: whereConditionAnd });
	}
	criteria = criteria[0];
	console.log("Condition", JSON.stringify(criteria));

	skiprecord = parseInt(req.query.iDisplayStart);
	iDisplayLength = parseInt(req.query.iDisplayLength);
	var vikingConfig = sails.config.vikingConfig;
	VikingRequest
		.find(criteria)
		.sort(sorttypevalue)
		.skip(skiprecord)
		.limit(iDisplayLength)
		.then(function (vikingData) {

			VikingRequest.count(criteria).exec(function countCB(error, totalrecords) {
				paymentHistory = [];
				vikingData.forEach(function (vikingInfo, loopvalue) {
					loopid = loopvalue + skiprecord + 1;
					var consumerName = '<a target=\"_blank\" href=\"getAchUserDetails\/' + vikingInfo.payment_id + '\">' + vikingInfo.consumerName + '</a>';
					var rejectReasonTxt = "-";
					if (vikingInfo.rejectCode) {
						if (vikingInfo.rejectCode != '') {
							rejectReasonTxt = vikingInfo.rejectCode + '-' + sails.config.vikingConfig.rejectReason[vikingInfo.rejectCode];
						}
					}
					var status = vikingInfo.status;
					if (vikingInfo.lenderType == 'credit') {
						if (vikingInfo.status == '1') {
							status = 'File sent to Viking';
						}
					}
					paymentHistory.push({
						loopid: loopid,
						uniqueID: vikingInfo.uniqueID,
						consumerName: consumerName,
						amount: '$' + vikingInfo.amount,
						scheduleDate: moment(vikingInfo.scheduleDate).format('ddd, MMM Do YYYY'),
						lenderType: vikingInfo.lenderType,
						status: status,
						rejectReason: rejectReasonTxt,
					});
				});
				var json = {
					sEcho: req.query.sEcho,
					iTotalRecords: totalrecords,
					iTotalDisplayRecords: totalrecords,
					aaData: paymentHistory
				};
				//sails.log.info("json data", json);
				res.contentType('application/json');
				res.json(json);
			});
		});
}

function ajaxPendingAchAction(req, res) { //!!!!!!!!!!!!

	var checktodaysDate = moment().tz("America/Los_Angeles").startOf('day').format('MM-DD-YYYY');
	var checkCreatedDate = moment().startOf('day').subtract(60, "days").format('MM-DD-YYYY');
	checkCreatedDate = moment(checkCreatedDate).tz("America/Los_Angeles").startOf('day').format('MM-DD-YYYY');

	if ("undefined" !== req.param("viewtype") && req.param("viewtype") != '' && req.param("viewtype") != null) {
		var viewtype = req.param("viewtype");
	}
	else {
		var viewtype = 'pending';
	}
	sails.log.info("viewtype:", viewtype);


	if ("undefined" !== typeof req.session.adminpracticeID && req.session.adminpracticeID != '' && req.session.adminpracticeID != null) {
		if (viewtype == 'pending') {
			var options = {
				status: 'OPENED',
				isPaymentActive: true,
				achstatus: { $eq: 0, $exists: true },
				practicemanagement: req.session.adminpracticeID,
				$and: [
					{
						$or: [{ moveToOpen: { $eq: 1, $exists: true } },
						{
							$and: [
								{ moveToOpen: { $exists: false } },
								{ createdAt: { $gte: new Date(checkCreatedDate), $exists: true } }
							]
						}
						]
					},
					{ $or: [{ appverified: { $eq: 1, $exists: true } }, { appverified: { $exists: false } }] }
				]
			};
		}
		else if (viewtype == 'archived') {
			var options = {
				status: 'OPENED',
				isPaymentActive: true,
				achstatus: { $eq: 0, $exists: true },
				practicemanagement: req.session.adminpracticeID,
				$and: [
					{
						$or: [{ moveToOpen: { $eq: 0, $exists: true } },
						{
							$and: [
								{ moveToOpen: { $exists: false } },
								{ createdAt: { $lt: new Date(checkCreatedDate), $exists: true } }
							]
						}
						]
					},
					{ $or: [{ appverified: { $eq: 1, $exists: true } }, { appverified: { $exists: false } }] }
				]
			};
		}
		else if (viewtype == 'toDoItems') {
			var options = {
				status: 'OPENED',
				isPaymentActive: true,
				achstatus: { $eq: 0, $exists: true },
				practicemanagement: req.session.adminpracticeID,
				appverified: { $eq: 0, $exists: true }
			};
		}
		else if (viewtype == 'proceduredate') {
			var options = {
				status: 'OPENED',
				isPaymentActive: true,
				achstatus: { $eq: 0, $exists: true },
				practicemanagement: req.session.adminpracticeID,
				loanSetdate: { $eq: new Date(checktodaysDate), $exists: true }
			};
		}
		else {
			var options = {
				status: 'OPENED',
				isPaymentActive: true,
				achstatus: { $eq: 0, $exists: true },
				practicemanagement: req.session.adminpracticeID,
				$and: [
					{
						$or: [{ moveToOpen: { $eq: 1, $exists: true } },
						{
							$and: [
								{ moveToOpen: { $exists: false } },
								{ createdAt: { $gte: new Date(checkCreatedDate), $exists: true } }
							]
						}
						]
					},
					{ $or: [{ appverified: { $eq: 1, $exists: true } }, { appverified: { $exists: false } }] }
				]
			};
		}
	}
	else {
		if (viewtype == 'pending') {
			var options = {
				status: 'OPENED',
				isPaymentActive: true,
				achstatus: { $eq: 0, $exists: true },
				$and: [
					{
						$or: [{ moveToOpen: { $eq: 1, $exists: true } },
						{
							$and: [
								{ moveToOpen: { $exists: false } },
								{ createdAt: { $gte: new Date(checkCreatedDate), $exists: true } }
							]
						}
						]
					},
					{ $or: [{ appverified: { $eq: 1, $exists: true } }, { appverified: { $exists: false } }] }
				]
				//$or : [ { blockedList: { $eq: false, $exists: true } }, { blockedList:{ $exists: false }}  ],
				//createdAt : { $gte : new Date(checkCreatedDate), $exists: true }
				/*$or : [ { moveToOpen:{ $eq: 1, $exists: true } },
							{ $and: [
								 { moveToOpen:{ $exists: false }},
								 { createdAt:{ $gte : new Date(checkCreatedDate), $exists: true } }
								]
						}
						],*/
				//$or : [ { appverified: { $eq: 1, $exists: true } }, { appverified:{ $exists: false }}  ]
			};
		}
		else if (viewtype == 'archived') {
			var options = {
				status: 'OPENED',
				isPaymentActive: true,
				achstatus: { $eq: 0, $exists: true },
				$and: [
					{
						$or: [{ moveToOpen: { $eq: 0, $exists: true } },
						{
							$and: [
								{ moveToOpen: { $exists: false } },
								{ createdAt: { $lt: new Date(checkCreatedDate), $exists: true } }
							]
						}
						]
					},
					{ $or: [{ appverified: { $eq: 1, $exists: true } }, { appverified: { $exists: false } }] }
				]
			};
		}
		else if (viewtype == 'toDoItems') {
			var options = {
				status: 'OPENED',
				isPaymentActive: true,
				achstatus: { $eq: 0, $exists: true },
				appverified: { $eq: 0, $exists: true }
			};
		}
		else if (viewtype == 'proceduredate') {
			var options = {
				status: 'OPENED',
				isPaymentActive: true,
				achstatus: { $eq: 0, $exists: true },
				loanSetdate: { $eq: new Date(checktodaysDate), $exists: true }
			};
		}
		else {
			var options = {
				status: 'OPENED',
				isPaymentActive: true,
				achstatus: { $eq: 0, $exists: true },
				$and: [
					{
						$or: [{ moveToOpen: { $eq: 1, $exists: true } },
						{
							$and: [
								{ moveToOpen: { $exists: false } },
								{ createdAt: { $gte: new Date(checkCreatedDate), $exists: true } }
							]
						}
						]
					},
					{ $or: [{ appverified: { $eq: 1, $exists: true } }, { appverified: { $exists: false } }] }
				]
			};
		}
	}

	PaymentManagement.find(options)
		.populate('user')
		.populate('account')
		.populate('practicemanagement')
		.populate('screentracking')
		.exec(function (err, paymentmanagementdata) {
			if (err) {
				res.send(500, { error: 'DB error' });
			} else {

				paymentmanagementdata = Screentracking.getFundingTierFromPaymentManagementList(paymentmanagementdata);

				if (req.query.sSortDir_0 == 'desc') {
					switch (req.query.iSortCol_0) {
						case '0': paymentmanagementdata = _.sortBy(paymentmanagementdata, '_id').reverse(); break;
						case '1': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'loanReference').reverse(); break;
						case '2': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.name').reverse(); break;
						//case '3': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.directMail').reverse(); break;
						//case '4': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.badList').reverse(); break;
						case '3': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.email').reverse(); break;
						case '4': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.phoneNumber').reverse(); break;
						case '5': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'practicemanagement.PracticeName').reverse(); break;
						case '6': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'fundingTier').reverse(); break;
						case '7': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'payOffAmount').reverse(); break;
						case '10': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'maturityDate').reverse(); break;
						case '11': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'createdAt').reverse(); break;
						case '12': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'status').reverse(); break;
						case '13': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'paymenttype').reverse(); break;
						case '15': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'apr').reverse(); break;
						default: break;
					};

				}
				else {
					switch (req.query.iSortCol_0) {
						case '0': paymentmanagementdata = _.sortBy(paymentmanagementdata, '_id'); break;
						case '1': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'loanReference'); break;
						case '2': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.name'); break;
						//case '3': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.directMail'); break;
						//case '4': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.badList'); break;
						case '3': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.email'); break;
						case '4': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.phoneNumber'); break;
						case '5': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'practicemanagement.PracticeName'); break;
						case '6': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'fundingTier'); break;
						case '7': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'payOffAmount'); break;
						case '10': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'maturityDate'); break;
						case '11': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'createdAt'); break;
						case '12': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'status'); break;
						case '13': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'paymenttype'); break;
						case '15': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'apr'); break;
						default: break;
					};
				}

				//Filter user details not available
				paymentmanagementdata = _.filter(paymentmanagementdata, function (item) {
					if (item.user) {
						return true;
					}
				});

				//Filter using search data
				if (req.query.sSearch) {
					var search = req.query.sSearch.toLowerCase();

					paymentmanagementdata = _.filter(paymentmanagementdata, function (item) {
						if (item.loanReference != null) {
							if (item.loanReference.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}

						if (item.user.firstname != null) {
							if (item.user.firstname.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}

						/* if(item.user.screenName!=null)
						 {
								 if(item.user.screenName.toLowerCase().indexOf(search)>-1 )
							 {
								 return true;
							 }
						 }*/
						if (item.user.email != null) {
							if (item.user.email.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}
						if (item.user.phoneNumber != null) {
							if (item.user.phoneNumber.indexOf(search) > -1) {
								return true;
							}
						}

						if (item.payOffAmount != null) {
							if (parseInt(item.payOffAmount) == parseInt(search)) {
								return true;
							}
						}

						if (item.maturityDate != null) {
							if (moment(item.maturityDate).format('MM-DD-YYYY') == search) {
								return true;
							}
						}


						if (item.createdAt != null) {
							if (moment(item.createdAt).format('MM-DD-YYYY') == search) {
								return true;
							}
						}

						if (item.paymenttype != null) {
							if (item.paymenttype.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}

						if (item.apr != null) {
							if (parseInt(item.apr) == parseInt(search)) {
								return true;
							}
						}

						if (item.practicemanagement) {
							if (item.practicemanagement.PracticeName != null) {
								if (item.practicemanagement.PracticeName.indexOf(search) > -1) {
									return true;
								}
							}
						}
						if (!!item.fundingTier) {
							if (item.fundingTier.indexOf(search) > -1) {
								return true;
							}
						}
						return false;
					});
				}

				//total records count
				totalrecords = paymentmanagementdata.length;

				//Filter by limit records
				var p = parseInt(req.query.iDisplayStart) + 1;
				skiprecord = parseInt(req.query.iDisplayStart);
				checklimitrecords = skiprecord + parseInt(req.query.iDisplayLength);
				if (checklimitrecords > totalrecords) {
					iDisplayLengthvalue = totalrecords;
				}
				else {
					//iDisplayLengthvalue=req.query.iDisplayLength;
					iDisplayLengthvalue = parseInt(req.query.iDisplayLength) + parseInt(skiprecord);
				}
				paymentmanagementdata = paymentmanagementdata.slice(skiprecord, iDisplayLengthvalue);


				//Final output starts here
				var creditScore = 0;
				var availableBalance = 0;
				var pendinguser = [];

				var forlength = paymentmanagementdata.length,
					i = 0;

				if (totalrecords == 0) {
					var json = {
						sEcho: req.query.sEcho,
						iTotalRecords: totalrecords,
						iTotalDisplayRecords: totalrecords,
						aaData: pendinguser
					};
					res.contentType('application/json');
					res.json(json);
				}
				else {

					_.forEach(paymentmanagementdata, function (payDetails) {

						var createdAtDate = moment(payDetails.createdAt).startOf('day').format('MM-DD-YYYY');
						var transcriteria = {
							createdAt: { "<": new Date(createdAtDate) },
							user: payDetails.user.id
						};


						if (payDetails.creditScore) {
							paymentmanagementdata.creditScore = payDetails.creditScore;
						}
						else {
							paymentmanagementdata.creditScore = 0;
						}



						i++;
						if (i == forlength) {


							paymentmanagementdata.forEach(function (paydata, loopvalue) {




								loopid = loopvalue + skiprecord + 1;

								var payuserName = '';
								var payuserscreenName = '';
								var payuserEmail = '';
								var payuserphoneNumber = '';

								var practicename = '--';
								if (paydata.practicemanagement) {
									if (paydata.practicemanagement.PracticeName != '' && paydata.practicemanagement.PracticeName != null) {
										var practicename = paydata.practicemanagement.PracticeName;
									}
								}

								if (paydata.user) {
									if (paydata.user.firstname != '' && paydata.user.firstname != null) {
										var payuserName = paydata.user.firstname + ' ' + paydata.user.lastname;
									}
									/*if(paydata.user.screenName!='' && paydata.user.screenName!=null)
									{
										var payuserscreenName=paydata.user.screenName;
									}*/
									if (paydata.user.email != '' && paydata.user.email != null) {
										var payuserEmail = paydata.user.email;
									}
									if (paydata.user.phoneNumber != '' && paydata.user.phoneNumber != null) {
										var payuserphoneNumber = paydata.user.phoneNumber;
									}
								}

								systemUniqueKeyURL = 'getAchUserDetails/' + paydata.id;

								if (paydata.loanReference != '' && paydata.loanReference != null) {
									var payloanReference = '<a href=\'' + systemUniqueKeyURL + '\'>' + paydata.loanReference + '</a>';
								} else {
									//var payloanReference='--';
									var payloanReference = '<a href=\'' + systemUniqueKeyURL + '\'> -- </a>';
								}
								paydata.maturityDate = moment(paydata.maturityDate).format('MM-DD-YYYY');
								//paydata.createdAt = moment(paydata.createdAt).format('MM-DD-YYYY hh:mm:ss');

								paydata.createdAt = moment(paydata.createdAt).tz("America/los_angeles").format('MM-DD-YYYY hh:mm:ss');

								//systemUniqueKeyURL = 'getAchUserDetails/'+paydata.user.systemUniqueKey;
								//systemUniqueKeyURL = 'getAchUserDetails/'+paydata.user.id;


								var payuserNameLink = '<a href=\'' + systemUniqueKeyURL + '\'>' + payuserName + '</a>';

								if (paydata.achstatus == 0) {
									var statusicon = '<i class=\'fa fa-circle text-warning\' aria-hidden=\'true\' ></i> Pending';
								}

								if (paydata.achstatus == 1) {
									var statusicon = '<i class=\'fa fa-circle text-success\' aria-hidden=\'true\' ></i> Approved';
								}

								if (paydata.achstatus == 2) {
									var statusicon = '<i class=\'fa fa-circle text-danger\' aria-hidden=\'true\' ></i> Denied';
								}
								//var statusicon ='Pending';

								if (payuserEmail) {
									var emillnk = '<a href="mailto:' + payuserEmail + '">' + payuserEmail + '</a>';
								}

								if (paydata.account) {
									if (paydata.account.balance) {
										//var availableBalance = paydata.account.balance.available;
										var availableBalance = paydata.account.balance.current;
									}
								}
								if (paydata.productname == 'State License') {
									var paytype = 'ACH';
								}
								else {
									var paytype = 'ACH';
								}

								if (paydata.payOffAmount) {
									var payOffAmountValue = '$' + parseFloat(paydata.payOffAmount);
								}
								else {
									var payOffAmountValue = '$0.00';
								}

								if (paydata.hasOwnProperty("apr")) {
									var apr = parseFloat(paydata.apr) + '%';
								}
								else {
									var apr = '--';
								}

								if (paydata.user.directMail == 1) {
									var directMailUser = 'Yes';
								}
								else if (paydata.user.directMail == 2) {
									var directMailUser = 'No';
								}
								else {
									var directMailUser = '--';
								}

								//badList
								if (paydata.user.badList == 1) {
									var badListUser = 'Yes';
								}
								else if (paydata.user.badList == 2) {
									var badListUser = 'No';
								}
								else {
									var badListUser = '--';
								}
								var fundingTier = "--";
								if (!!paydata.fundingTier) {
									fundingTier = paydata.fundingTier;
								} else {
									paydata["fundingTier"] = "";
								}
								var registeredType = paydata.user.registeredtype;


								/*pendinguser.push({ loopid:loopid,loanReference: payloanReference, name: payuserName,directMail: directMailUser, badList: badListUser, email: payuserEmail,phoneNumber: payuserphoneNumber,payOffAmount:payOffAmountValue,creditScore:paydata.creditScore, availableBalance:availableBalance ,maturityDate:paydata.maturityDate, createdAt:paydata.createdAt, status: statusicon, paymenttype: paytype,registeredType:registeredType,apr:apr});*/


								pendinguser.push({ loopid: loopid, loanReference: payloanReference, name: payuserName, email: payuserEmail, phoneNumber: payuserphoneNumber, practicename: practicename, payOffAmount: payOffAmountValue, creditScore: paydata.creditScore, availableBalance: availableBalance, maturityDate: paydata.maturityDate, createdAt: paydata.createdAt, status: statusicon, paymenttype: paytype, registeredType: registeredType, apr: apr, fundingTier: fundingTier });
							});


							var json = {
								sEcho: req.query.sEcho,
								iTotalRecords: totalrecords,
								iTotalDisplayRecords: totalrecords,
								aaData: pendinguser
							};
							res.contentType('application/json');
							res.json(json);
						}

					});
				}
			}
		});
}

function getAchUserDetailsAction(req, res) {
	const payID = req.param("id");
	if (!payID) {
		const errors = {
			code: 500,
			message: "Invalid Data"
		};
		sails.log.error("AchController#getAchUserDetailsAction :: errors", errors);
		res.view("admin/error/500", {
			data: errors.message,
			layout: "layout"
		});
	}

	const options = {
		id: payID
	};

	// Log Activity
	const modulename = "Viewing Loan";
	const modulemessage = "Viewing Loan Details";
	req.achlog = 0;
	req.payID = payID;
	return Promise.resolve()
		.then(() => {
			sails.log.info("ACHC ! req.session.hasOwnProperty( 'lastActivityId' )", !req.session.hasOwnProperty("lastActivityId"));
			sails.log.info("ACHC req.session.lastActivityId", req.session.lastActivityId);
			sails.log.info("ACHC payID", payID);
			if (!req.session.hasOwnProperty("lastActivityId") || req.session.lastActivityId != payID) {
				return Logactivity.registerLogActivity(req, modulename, modulemessage);
			}
		})
		.then(() => {
			req.session.lastActivityId = payID;
		})
		.then(() => {
			PaymentManagement.findOne(options)
				.populate("story")
				// .populate('consolidateaccount')
				.populate("screentracking")
				.then(function (paymentmanagementdata) {
					// user criteria
					const criteria = {
						id: paymentmanagementdata.user
					};

					User.findOne(criteria)
						// .populate('state')
						// .populate('profilePicture')
						.then(function (user) {
							if (!user) {
								const errors = {
									code: 404,
									message: "User not found"
								};
								sails.log.error("AchController#getAchUserDetailsAction :: errors", errors);
								res.view("admin/error/404", {
									data: errors.message,
									layout: "layout"
								});
							} else {
								// -- Added for back button redirect from detail page starts here
								let checkCreatedDate = moment()
									.startOf("day")
									.subtract(60, "days")
									.format("MM-DD-YYYY");
								checkCreatedDate = moment(checkCreatedDate)
									.tz("America/Los_Angeles")
									.startOf("day")
									.toDate(); // .getTime();
								const loanCreartedDate = moment(paymentmanagementdata.createdAt)
									.tz("America/Los_Angeles")
									.startOf("day")
									.toDate(); // .getTime();
								const loanSetDateTime = "";
								const currentDateTime = "";

								let redirectArchive = 0;
								let backviewType;

								if (paymentmanagementdata.screentracking.moveToArchive) {
									if (paymentmanagementdata.screentracking.moveToArchive == 1) {
										redirectArchive = 1;
									}
								} else {
									if (loanCreartedDate < checkCreatedDate) {
										redirectArchive = 1;
									}
								}

								if (redirectArchive == 1) {
									if (paymentmanagementdata.achstatus == 1) {
										backviewType = "/admin/showFundedContracts";
									} else {
										backviewType = "/admin/getArchivedOpenDetails";
									}
								} else {
									if (paymentmanagementdata.achstatus == 0) {
										backviewType = "/admin/getOpenApplicationDetails";
									} else if (paymentmanagementdata.achstatus == 2) {
										backviewType = "/admin/showAllDenied";
									} else if (paymentmanagementdata.achstatus == 1) {
										if (paymentmanagementdata.status == "PAID OFF" || paymentmanagementdata.status == "CLOSED") {
											backviewType = "/admin/getArchivedOpenDetails";
										} else {
											if (paymentmanagementdata.firstpaymentcompleted == 1) {
												backviewType = "/admin/showAllInprogress";
											} else {
												backviewType = "/admin/showAllComplete";
											}
										}
									} else {
										backviewType = "/admin/getOpenApplicationDetails";
									}
								}

								/* var backviewType='';
									 if(paymentmanagementdata.achstatus == 0)
									 {
											backviewType ='/admin/getArchivedOpenDetails';
			
											if(loanCreartedDate > checkCreatedDate)
											{
												backviewType ='/admin/getOpenApplicationDetails';
											}
											else
											{
											 if(paymentmanagementdata.screentracking.moveToIncomplete)
											 {
												 if(paymentmanagementdata.screentracking.moveToIncomplete==1)
												 {
													backviewType ='/admin/getOpenApplicationDetails';
												 }
											 }
										 }
									 }
			
									 if(paymentmanagementdata.achstatus == 1)
									 {
										 backviewType ='/admin/showAllComplete';
										 if(paymentmanagementdata.status=='PAID OFF' || paymentmanagementdata.status=='CLOSED' )
										 {
											 backviewType ='/admin/showFundedContracts';
										 }
										 else
										 {
											 if(paymentmanagementdata.loanSetdate)
											 {
												 var loanSetDateTime = moment(paymentmanagementdata.loanSetdate).tz("America/Los_Angeles").startOf('day').toDate().getTime();
												 var currentDateTime = moment().tz("America/Los_Angeles").startOf('day').toDate().getTime();
			
													if(currentDateTime > loanSetDateTime)
													{
														backviewType ='/admin/showAllInprogress';
													}
											 }
										 }
									 }
			
									 if(paymentmanagementdata.achstatus == 2)
									 {
										 backviewType ='/admin/showAllArchivedDenied';
			
										 if(loanCreartedDate > checkCreatedDate)
										 {
												backviewType ='/admin/showAllDenied';
										 }
										 else
										 {
											 if(paymentmanagementdata.screentracking.moveToIncomplete)
											 {
												 if(paymentmanagementdata.screentracking.moveToIncomplete==1)
												 {
													backviewType ='/admin/showAllDenied';
												 }
											 }
										 }
									 }	*/
								// -- Added for back button redirect from detail page ends here

								const profileImage = "";

								if ("undefined" !== typeof paymentmanagementdata.account && paymentmanagementdata.account != "" && paymentmanagementdata.account != null) {
									var criteria = {
										user: user.id,
										id: paymentmanagementdata.account
									};
								} else {
									var criteria = {
										user: user.id,
										id: paymentmanagementdata.screentracking.accounts
									};
								}

								sails.log.info("Account criteria: ", criteria);

								// --Filled out manually check
								let userfilloutmanually = 0;


								UserBankAccount.getBankData(paymentmanagementdata.screentracking.id, user.id, paymentmanagementdata)
									.then((accountDetail) => {
										const doccriteria = {
											user: user.id
										};
										Achdocuments.find(doccriteria)
											.populate("proofdocument")
											.then(function (documentdata) {
												_.forEach(documentdata, function (documentvalue) {
													if (documentvalue.proofdocument.isImageProcessed) {
														if (documentvalue.proofdocument.standardResolution) {
															documentvalue.proofdocument.standardResolution = Utils.getS3Url(documentvalue.proofdocument.standardResolution);
														}
													}
												});

												const pdfCriteria = { $or: [{ paymentManagement: paymentmanagementdata.id }, { user: user.id, documentKey: "132" }] };

												sails.log.info("pdfCriteria: ", pdfCriteria);

												UserConsent.find(pdfCriteria).then(function (pdfdocument) {
													if (pdfdocument) {
														_.each(pdfdocument, function (documemts) {
															if (documemts.agreementpath) {
																documemts.agreementpath = Utils.getS3Url(documemts.agreementpath);
															}
														});
													}

													PaymentManagement.count({ user: user.id })
														.then(function (loancount) {
															const paydata = [];
															setcurrent = 0;
															// var todaysDate = moment().add(15, 'days').startOf('day').toDate().getTime();
															const todaysDate = moment()
																.startOf("day")
																.toDate()
																.getTime();

															// var todaysDatevalue = moment().add(15, 'days').format("YYYY-MM-DD");

															let nextpaymentDate = "--";
															const pendingSchedule = [];
															const paidSchedule = [];
															let amount;
															let interestAmount = "0";
															const interestAmount1 = "0";

															_.forEach(paymentmanagementdata.paymentSchedule, function (payDetails) {
																amount = parseFloat(payDetails.amount).toFixed(2);

																if (amount > 0) {
																	payDetails.amount = amount.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
																	payDetails.amount = "$" + payDetails.amount;
																}

																if (paymentmanagementdata.screentracking.preferredDueDate) {
																	const preferredDueDate = parseInt(paymentmanagementdata.screentracking.preferredDueDate) - 1;
																	payDetails.date = moment(payDetails.date).startOf('month').add(preferredDueDate, 'days');
																}

																// var scheduleDate = moment(payDetails.date).startOf('day').toDate().getTime();
																const scheduleDate = moment(payDetails.date)
																	.add(2, "days")
																	.startOf("day")
																	.toDate()
																	.getTime();

																if (payDetails.status == "PAID OFF") {
																	paidSchedule.push(payDetails);
																} else {
																	pendingSchedule.push(payDetails);
																}

																if (payDetails.chargeoff == 1) {
																	payDetails.status = "Charge Off";
																} else {
																	if (scheduleDate < todaysDate && payDetails.status == "OPENED") {
																		payDetails.status = "Late";
																	} else if (payDetails.status == "OPENED" && setcurrent == 0) {
																		payDetails.status = "Current";
																		nextpaymentDate = moment(payDetails.date).format("LL");
																		setcurrent = setcurrent + 1;
																	} else if (payDetails.status == "PAID OFF") {
																		payDetails.status = "Paid Off";
																	} else if (payDetails.status == "CLOSED") {
																		payDetails.status = "Closed";
																	} else {
																		payDetails.status = "Schedule";
																	}
																}

																payDetails.orgdate = payDetails.date;
																payDetails.date = moment(payDetails.date).format("LL");

																paydata.push(payDetails);

																interestOrginalAmount = parseFloat(payDetails.interestAmount).toFixed(2);
																interestAmount = parseFloat(interestAmount) + parseFloat(interestOrginalAmount);
																interestAmount = parseFloat(interestAmount).toFixed(2);
															});
															paymentmanagementdata.paymentSchedule = paydata;
															paymentmanagementdata.maturityDate = moment(paymentmanagementdata.maturityDate).format("LL");
															paymentmanagementdata.nextPaymentSchedule = moment(paymentmanagementdata.nextPaymentSchedule).format("LL");

															if (paymentmanagementdata.loanStartdate) {
																paymentmanagementdata.loanStartdate = moment(paymentmanagementdata.loanStartdate).format("LL");
															}

															var counterOfferdecline = paymentmanagementdata.counterOfferDecline;
															if (counterOfferdecline == undefined || counterOfferdecline == "" || counterOfferdecline == null) {
																var counterOfferdecline = "--";
															} else {
																var counterOfferdecline =
																	paymentmanagementdata.counterOfferDecline +
																	" At " +
																	moment(paymentmanagementdata.createdAt)
																		.tz("America/los_angeles")
																		.format("MM-DD-YYYY hh:mm:ss");
															}

															const objectdatas = {
																creditcost: paymentmanagementdata.payOffAmount,
																amount: interestAmount
															};

															if (paymentmanagementdata.productname == "State License") {
																var paytype = "ACH";
															} else {
																var paytype = "ACH";
															}
															const loanPaymentType = paytype;

															if (paymentmanagementdata.transactionStatus) {
																var transactionStatus = paymentmanagementdata.transactionStatus;
															} else {
																var transactionStatus = "";
															}

															setcurrent = 0;
															_.forEach(paymentmanagementdata.paymentSchedule, function (payDetails) {
																const todaysDate = moment()
																	.startOf("day")
																	.toDate()
																	.getTime();
																const scheduleDate = moment(payDetails.date)
																	.add(2, "days")
																	.startOf("day")
																	.toDate()
																	.getTime();

																if (setcurrent == 0) {
																	if (scheduleDate < todaysDate && payDetails.status == "OPENED") {
																		paymentmanagementdata.status = "Late";
																		setcurrent = 1;
																	} else if (paymentmanagementdata.status == "OPENED" || paymentmanagementdata.status == "CURRENT") {
																		paymentmanagementdata.status = "Current";
																	}
																}
															});

															if (paymentmanagementdata.achstatus == 0) {
																var statusicon = "Pending";
															}

															if (paymentmanagementdata.achstatus == 1) {
																var statusicon = "Funded";
															}

															/* new fields */

															const manualpaymentdata = [];
															_.forEach(paymentmanagementdata.manualPayment, function (manualpay) {
																manualpay.message = "Loan repayment for $" + manualpay.amount + " ";
																manualpay.date = moment(manualpay.date).format("LL");
																manualpaymentdata.push(manualpay);
															});
															paymentmanagementdata.manualPayment = manualpaymentdata;
															_.forEach(paymentmanagementdata.usertransactions, function (reapayment) {
																reapayment.amount = parseFloat(reapayment.amount).toFixed(2);
																reapayment.date = moment(reapayment.date).format("LL");
															});

															Logactivity.find({ paymentManagement: payID })
																.sort({ createdAt: -1 })
																.then(function (logDetails) {
																	const logArrayDetails = [];
																	_.forEach(logDetails, function (logdata) {
																		logdata.createdAt = moment(logdata.createdAt, "HH:mm:ss")
																			.tz("America/los_angeles")
																			.format("MM-DD-YYYY HH:mm:ss");
																		logArrayDetails.push(logdata);
																	});

																	user.createdAt = moment(user.createdAt).format("LL");
																	user.updatedAt = moment(user.updatedAt).format("LL");

																	Useractivity.find({ user_id: user.id })
																		.sort({ createdAt: -1 })
																		.then(function (communicationLogDetails) {
																			const responseArr = [];

																			_.forEach(communicationLogDetails, function (communicationLogData) {
																				communicationLogData.subject = communicationLogData.subject;
																				communicationLogData.logdata = communicationLogData.logdata;
																				communicationLogData.createdAt = moment(communicationLogData.createdAt)
																					.tz("America/los_angeles")
																					.format("MM-DD-YYYY hh:mm:ss");
																				responseArr.push(communicationLogData);
																			});
																			let errorval = "";
																			let successmsg = "";
																			let schudlesmsg = "";
																			let banksuccessmsg = "";
																			let bankerror = "";
																			let changeincomemsg = "";
																			let uploaddocmsg = "";
																			let fromResetToPending = "";

																			if (req.session.bankerror != "") {
																				errorval = req.session.bankerror;
																				bankerror = req.session.bankerror;
																				req.session.bankerror = "";
																			}
																			if (req.session.banksuccessmsg != "") {
																				banksuccessmsg = req.session.banksuccessmsg;
																				req.session.banksuccessmsg = "";
																			}
																			if (req.session.successmsg != "") {
																				successmsg = req.session.successmsg;
																				req.session.successmsg = "";
																			}
																			if (req.session.schudlesmsg != "") {
																				schudlesmsg = req.session.schudlesmsg;
																				req.session.schudlesmsg = "";
																			}
																			if ("undefined" !== typeof req.session.uploaddocmsg && req.session.uploaddocmsg != "" && req.session.uploaddocmsg != null) {
																				uploaddocmsg = req.session.uploaddocmsg;
																				req.session.uploaddocmsg = "";
																			}
																			if ("undefined" !== typeof req.session.fromResetToPending && req.session.fromResetToPending != "" && req.session.fromResetToPending != null) {
																				fromResetToPending = req.session.fromResetToPending;
																				req.session.fromResetToPending = "";
																			}

																			if (req.session.changeincometab != "") {
																				changeincomemsg = req.session.changeincometab;
																				req.session.changeincometab = "";
																			}
																			if (pendingSchedule.length > 0) {
																				// pendingSchedule = _.orderBy(pendingSchedule, ['date'], ['asc']);
																			}

																			if (paidSchedule.length > 0) {
																				// paidSchedule = _.orderBy(paidSchedule, ['date'], ['asc']);
																			}

																			const transcriteria = { id: paymentmanagementdata.screentracking.transunion };

																			Transunions.findOne(transcriteria)
																				.sort("createdAt DESC")
																				.then(function (transData) {
																					if ("undefined" === typeof transData || transData == "" || transData == null) {
																						var showtransData = 0;
																					} else {

																						var DTItrade;
																						if (transData) {
																							DTItrade = transData.getTradeDebt(paymentmanagementdata.screentracking.residenceType, paymentmanagementdata.screentracking.housingExpense);
																							//DTItrade.terms.scheduledMonthlyPayment;
																							_.forEach(DTItrade.trades, function (trade) {
																								trade.terms.scheduledMonthlyPayment = parseFloat(trade.terms.scheduledMonthlyPayment)
																							})

																						}
																						var showtransData = 1;

																						if (transData.credit_collection.subscriber) {
																							const transcreditArray = transData.credit_collection;
																							transData.credit_collection = [];
																							transData.credit_collection.push(transcreditArray);
																						}

																						if (transData.inquiry.subscriber) {
																							const transinquiryArray = transData.inquiry;
																							transData.inquiry = [];
																							transData.inquiry.push(transinquiryArray);
																						}

																						if (transData.addOnProduct.status) {
																							const transproductArray = transData.addOnProduct;
																							transData.addOnProduct = [];
																							transData.addOnProduct.push(transproductArray);
																						}

																						if (transData.house_number.status) {
																							const transhouseArray = transData.house_number;
																							transData.house_number = [];
																							transData.house_number.push(transhouseArray);
																						}

																						if (transData.trade.subscriber) {
																							const transtradeArray = transData.trade;
																							transData.trade = [];
																							transData.trade.push(transtradeArray);
																						}

																						if (transData.response.product.subject.subjectRecord && transData.response.product.subject.subjectRecord.custom && transData.response.product.subject.subjectRecord.custom.credit) {
																							if (!Array.isArray(transData.response.product.subject.subjectRecord.custom.credit.publicRecord)) {
																								const transpublicrecordArray = transData.response.product.subject.subjectRecord.custom.credit.publicRecord;
																								transData.publicrecord = [];
																								transData.publicrecord.push(transpublicrecordArray);
																							} else {
																								transData.publicrecord = transData.response.product.subject.subjectRecord.custom.credit.publicRecord;
																							}
																						}
																					}



																					let userAccount = "";
																					if (transData) {
																						if (transData.response) {
																							userAccount = transData.response;
																						}
																					}
																					var totalbalance = 0;
																					const sum = 0;

																					/* if(userAccount.product.subject.subjectRecord.custom.credit.trade)
																							{
																									var userAccountlist = userAccount.product.subject.subjectRecord.custom.credit.trade;
																									var currentBalance ='';
																									var totalbalance = 0;
																									var numformt = 0;
																									var selectedaccount = [];
																									var selectedamount = [];
																									var sum =0;
									
									
																									if ("undefined" !== typeof paymentmanagementdata.consolidateaccount && paymentmanagementdata.consolidateaccount!='' && paymentmanagementdata.consolidateaccount!=null)
																									{
																										var consoldateaccount = paymentmanagementdata.consolidateaccount.trade;
																										var selectBalance ='';
																										_.forEach(consoldateaccount, function (selaccount) {
																											var accountnumber = selaccount.accountNumber;
																											selectBalance = parseFloat(selaccount.currentBalance);
																											selectedaccount.push(accountnumber);
																											selectedamount.push(selectBalance);
																										});
																										sum = selectedamount.reduce((a, b) => a + b, 0);
																									}
									
																									_.forEach(userAccountlist, function (account) {
																									if(account.subscriber){
																										var industryCode = account.subscriber.industryCode;
																									}else{
																										var industryCode = 0;
																									}
																									var accountNumber = account.accountNumber;
																									if ((industryCode === 'B' || industryCode === 'R' || industryCode === 'F') && account.currentBalance > 0 && account.currentBalance < 75000) {
																										currentBalance = parseFloat(account.currentBalance);
																										account.currentBalance = currentBalance.toFixed(2);
																										totalbalance = totalbalance+currentBalance;
																										numformt = account.currentBalance;
																										account.currentBalance = numformt.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
																										if (in_array(accountNumber, selectedaccount)) {
																											account.selectstatus = 'checked';
																										}
																										subTypeArray.push(account);
																									}
																									});
																							}*/

																					if (paymentmanagementdata.screentracking.offerdata && paymentmanagementdata.screentracking.offerdata.length > 0) {
																						if (paymentmanagementdata.screentracking.offerdata[0].financedAmount) {
																							var totalbalance = parseFloat(paymentmanagementdata.screentracking.offerdata[0].financedAmount ? paymentmanagementdata.screentracking.offerdata[0].financedAmount.toString() : "0");
																							var totalbalance = totalbalance.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
																						}
																					}
																					// sum =parseFloat(sum).toFixed(2);

																					const screentrackingres = paymentmanagementdata.screentracking;
																					const monthlyIncomeAmount = parseFloat(screentrackingres.incomeamount || "0");

																					let annualIncomeAmount = 0;
																					if (monthlyIncomeAmount > 0) {
																						annualIncomeAmount = parseFloat((monthlyIncomeAmount * 12).toFixed(2));
																					}
																					console.log(`Monthly = ${monthlyIncomeAmount}, Annual = ${annualIncomeAmount}`);
																					screentrackingres.consolidateaccount = paymentmanagementdata.consolidateaccount;

																					Screentracking.getDTIoffers(userAccount, screentrackingres)
																						.then(function (dtiandoffers) {
																							const documenttype1 = sails.config.loanDetails.doctype1;
																							const documenttype2 = sails.config.loanDetails.doctype2;
																							const documenttype3 = sails.config.loanDetails.doctype3;

																							const documenttype = {
																								documenttype1: documenttype1,
																								documenttype2: documenttype2,
																								documenttype3: documenttype3
																							};

																							//* ***Bank account start******//

																							const income_amt = "-----";

																							let payroll_detected = dtiandoffers.payroll_detected;
																							sails.log.info(" payroll_detected", dtiandoffers);
																							if (payroll_detected === undefined || payroll_detected === "" || payroll_detected === null) {
																								payroll_detected = "-----";
																							}

																							//* ***Bank account end******//

																							const userid = user.id;

																							/* gets only application denied, due to low income*/

																							if ("undefined" !== paymentmanagementdata.screentracking.lastlevel && paymentmanagementdata.screentracking.lastlevel != "" && paymentmanagementdata.screentracking.lastlevel != null) {
																								var lastlevel = paymentmanagementdata.screentracking.lastlevel;
																							} else {
																								var lastlevel = 0;
																							}
																							/* gets only application denied, due to low income*/
																							Makepayment.getFullpayment(paymentmanagementdata.id)
																								.then(function (makePaymentForStory) {
																									let makebuttonshow = "no";
																									if (makePaymentForStory.code == 200) {
																										const todayDate = moment()
																											.startOf("day")
																											.format();
																										if ("undefined" !== typeof paymentmanagementdata.makepaymentdate && paymentmanagementdata.makepaymentdate != "" && paymentmanagementdata.makepaymentdate != null) {
																											var lastpaiddate = paymentmanagementdata.makepaymentdate;
																										} else {
																											var lastpaiddate = paymentmanagementdata.paymentSchedule[0].lastpaiddate;
																										}
																										const makepaymentDate = moment(lastpaiddate)
																											.startOf("day")
																											.format();

																										sails.log.error("makepaymentDate", makepaymentDate);
																										sails.log.error("todayDate", todayDate);

																										if (todayDate >= makepaymentDate) {
																											makebuttonshow = "yes";
																										}
																									}

																									// -- blocked viking
																									const vikingCreditAmt = 0;
																									const totalrecords = 0;
																									const vikingResult = [];
																									const creditFileStatus = "sent";
																									const IPFromRequest = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
																									const indexOfColon = IPFromRequest.lastIndexOf(":");
																									const ip = IPFromRequest.substring(indexOfColon + 1, IPFromRequest.length);

																									// For move to open
																									const currentDate = moment()
																										.tz("America/Los_Angeles")
																										.startOf("day");
																									const paymentDate = moment(paymentmanagementdata.createdAt).startOf("day");
																									const paymentDatediff = currentDate.diff(paymentDate, "days");

																									// Document
																									let creditfilefound = 0;
																									let creditfilename = "";
																									// if(paymentmanagementdata.localcreditfilepath!='')
																									if (paymentmanagementdata.localcreditfilepath != "" && paymentmanagementdata.localcreditfilepath != null && "undefined" !== typeof paymentmanagementdata.localcreditfilepath) {
																										creditfilefound = 1;

																										creditfilename = sails.config.getBaseUrl + "ActumCredit/" + paymentmanagementdata.localcreditfilepath;
																									}

																									// -- Loan set date
																									let loanSetDateExist = 0;
																									let showApproveButton = 0;

																									if (paymentmanagementdata.loanSetdate) {
																										loanSetDateExist = 1;

																										const loanSetDateMoment = moment(paymentmanagementdata.loanSetdate);
																										if (
																											moment()
																												.add(1, "day")
																												.startOf("day")
																												.diff(loanSetDateMoment) > 0
																										) {
																											showApproveButton = 1;
																										}

																										paymentmanagementdata.loanSetdate = loanSetDateMoment.format("L");
																									}
																									const practcriteria = {
																										practicemanagement: paymentmanagementdata.practicemanagement
																									};

																									// sails.log.info("practcriteria::::::::::",practcriteria);

																									PracticeUser.find(practcriteria).then(function (practiceResults) {
																										const practiceDocResults = [];
																										const practiceAllResults = [];
																										const practiceids = [];

																										let linkedstaffArr = [];
																										let linkedDoctorArr = [];

																										if (practiceResults) {
																											if (paymentmanagementdata.linkedstaff) {
																												linkedstaffArr = paymentmanagementdata.linkedstaff;
																											}

																											if (paymentmanagementdata.linkeddoctor) {
																												linkedDoctorArr = paymentmanagementdata.linkeddoctor;
																											}
																											_.forEach(practiceResults, function (practice) {
																												let staffexist = 0;
																												let doctorexist = 0;
																												if (linkedstaffArr.length > 0) {
																													if (in_array(practice.id, linkedstaffArr)) {
																														staffexist = 1;
																													}
																												}

																												if (linkedDoctorArr.length > 0) {
																													if (in_array(practice.id, linkedDoctorArr)) {
																														doctorexist = 1;
																													}
																												}

																												const practiceinfo = {
																													id: practice.id,
																													fullname: practice.firstname + " " + practice.lastname,
																													staffexist: staffexist,
																													doctorexist: doctorexist
																												};
																												if (practice.role == "PracticeDoctor") {
																													practiceDocResults.push(practiceinfo);
																												}
																												practiceAllResults.push(practiceinfo);
																											});
																										}
																										// sails.log.info("loooppppppppp::::::::::");

																										PracticeUser.getPracticeDetails(linkedstaffArr, linkedDoctorArr).then(function (linkedpracticeRes) {
																											var linkedpractices = [];
																											if (linkedpracticeRes.code == 200) {
																												var linkedpractices = linkedpracticeRes.result;
																											}
																											const incompleteCrieteria = { user: user.id, iscompleted: [0, 2] };
																											Screentracking.find(incompleteCrieteria).then(function (incompleteloanRes) {
																												const scriteria = { id: paymentmanagementdata.screentracking.id };
																												sails.log.info("scriteria", scriteria);
																												Screentracking.findOne(scriteria)
																													.populate("practicemanagement")
																													.then(function (screenPracticeRes) {
																														const stateCode = screenPracticeRes.practicemanagement.StateCode;
																														const checkLAState = sails.config.plaid.checkLAState;
																														const loanAmntarr = [];
																														let lockedToG;
																														if (screenPracticeRes.lockCreditTier && screenPracticeRes.lockCreditTier == "G") {
																															lockedToG = "true";
																														} else {
																															lockedToG = "";
																														}
																														loanAmntarr.push(sails.config.plaid.basicLoanamount);
																														if (stateCode == checkLAState) {
																															loanAmntarr.push(sails.config.plaid.LAminLoanamount);
																														}
																														Screentracking.getGradeLoanamount(screenPracticeRes, loanAmntarr).then(function (gradeResults) {
																															sails.log.info("gradeResults", gradeResults);
																															const loansettingcriteria = {
																																loanactivestatus: 1,
																																practicemanagement: screenPracticeRes.practicemanagement.id
																															};
																															LoanSettings.find(loansettingcriteria).then(function (loansettingData) {
																																Paymentcomissionhistory.find({ paymentmanagement: payID }).then(function (comissionDetails) {
																																	PaymentManagement.find({
																																		where: { id: payID },
																																		select: ['user']
																																	})
																																		.then(function (uid) {
																																			EmploymentHistory.queryEmploymentHistory(uid[0].user)
																																				.then(function (employmentInfo) {

																																					//set up fxi score
																																					let ficoScore = 0;
																																					let incomeEstimator = 0;

																																					_.forEach(transData.addOnProduct, (element) => {
																																						if (element.code == "00W18") {
																																							ficoScore = element.scoreModel.score.results;
																																							if (ficoScore[0] == "+" || ficoScore[0] == "-")
																																								ficoScore = ficoScore.substring(1);
																																						}
																																						if (element.code == "00N03" && !element.scoreModel.score.noScoreReason) {
																																							incomeEstimator = element.scoreModel.score.results;

																																							if (incomeEstimator[0] == "+" || incomeEstimator == "-")
																																								incomeEstimator = incomeEstimator.substring(1);
																																						}
																																					})

																																					ficoScore = Number(ficoScore);
																																					incomeEstimator = Number(incomeEstimator);

																																					let fxiScore = ficoScore * incomeEstimator / 1000;
																																					fxiScore = fxiScore.toFixed(2);
																																					let rule16 = 'R16: FXI Score: ' + fxiScore;
																																					if (!paymentmanagementdata.screentracking.rulesDetails) {
																																						paymentmanagementdata.screentracking.rulesDetails = { ruledatacount: [] };
																																					}
																																					paymentmanagementdata.screentracking.rulesDetails.ruledatacount.push(rule16);
																																					// Checks if an specific rule passed or not
																																					sails.log.warn("user: ", user);
																																					sails.log.warn("accountDetail", accountDetail[accountDetail.length - 1]);
																																					PlaidAssetReport.find().limit(1).then((assetReport) => {
																																						const bankrules = (assetReport && paymentmanagementdata.screentracking.rulesDetails && !paymentmanagementdata.screentracking.rulesDetails.banktransactionrules) ? executeBTRs(assetReport[0]) : [];
																																						const btrHasLength = !assetReport ? false : true;
																																						
																																						if (paymentmanagementdata.screentracking.rulesDetails && !paymentmanagementdata.screentracking.rulesDetails.banktransactionrules) {
																																							try {
																																								paymentmanagementdata.screentracking.rulesDetails.banktransactionrules = { ...bankrules };
																																								const btrs = {
																																									rulesDetails: {
																																										...paymentmanagementdata.screentracking.rulesDetails,
																																										banktransactionrules: { ...bankrules }
																																									}
																																								};
																																								Screentracking.update({ id: paymentmanagementdata.screentracking.id }, btrs).then((response) => {
																																								});
																																							} catch (e) {
																																								btrHasLength = false;
																																							}
																																						}
																																						
																																						let getRuleEntry;
																																						let ruleDataHasLength;
																																						if (paymentmanagementdata.screentracking.rulesDetails && paymentmanagementdata.screentracking.rulesDetails.ruledata) {
																																							ruleDataHasLength = Object.keys(paymentmanagementdata.screentracking.rulesDetails.ruledata).length;
																																							getRuleEntry = (ruleIndex) => {
																																								if (Object.values(paymentmanagementdata.screentracking.rulesDetails.ruledata)[ruleIndex]) {
																																									return Object.values(paymentmanagementdata.screentracking.rulesDetails.ruledata)[ruleIndex].passed;
																																								}
																																								return null;
																																							}
																																						}

																																						const creditTierCriteria = { practicemanagement: screenPracticeRes.practicemanagement.id };
																																						if( paymentmanagementdata.screentracking.lockCreditTier ) {
																																							creditTierCriteria.creditTier = paymentmanagementdata.screentracking.lockCreditTier;
																																						} else {
																																							creditTierCriteria.minCreditScore = { $lte: paymentmanagementdata.screentracking.creditscore };
																																							creditTierCriteria.maxCreditScore = { $gte: paymentmanagementdata.screentracking.creditscore };
																																						}
																																						sails.log.warn("credit criteria screntracking", creditTierCriteria)
																																						return LoanCreditTier.findOne( creditTierCriteria )
																																							.then((creditTier) => {
																																								sails.log.warn("credit tier", creditTier)
																																								const loaninterestcriteria = {
																																									practicemanagement: screenPracticeRes.practicemanagement.id,
																																									creditTier: creditTier.creditTier
																																								}
																																								return Loaninterestrate.findOne(loaninterestcriteria)
																																									.then((loaninterestrate) => {
																																										const userconsentid = user.id;
																																										UserConsent.objectdataforpdf(userconsentid, req, res)
																																											.then(function(objectdatas) {
																																												return UserConsent.find({ user: userconsentid, screenid: paymentmanagementdata.screentracking.id }).then((userconsents) => {
																																													let creditReportConsentExists = false;
																																													let creditReportConsent = {};
																																													_.forEach(userconsents, function(userconsent) {
																																														if (userconsent.documentName == "TransUnion_CreditReport") {
																																															creditReportConsentExists = true;
																																														}
																																														if(userconsent.isConnexusDoc){
																																															userconsent.agreementpath = Utils.getS3UrlCCUDocs(
																																																userconsent.agreementpath
																																															);
																																														}else{
																																															if (userconsent.agreementpath) {
																																																userconsent.agreementpath = Utils.getS3Url(userconsent.agreementpath);
																																															}
																																														}
																																														userconsent.documentName = userconsent.documentName.replace(/PromissoryNote_/gi, 'Retail_Installment_Contract_');
																																													});
																																													if (!creditReportConsentExists) {
																																														sails.log.warn("no existe", user.id)
																																														const pdfFilePath = path.join( sails.config.appPath, "logs/transunion", `${user.id}.pdf` );
																																														return Transunionhistory.findOne({ user: user.id })
																																														.then( async (transunionhistory) => {
																																															const creditBureau = transunionhistory.responsedata.creditBureau;
																																															sails.log.warn("credit bureau", creditBureau)
																																															const pdfString = _.get( creditBureau, "product.embeddedData._" );
																																															if( pdfString ) {
																																																sails.log.warn("has pdf string")
																																																const pdfBytes = Buffer.from( pdfString, "base64" );
																																																fs.writeFileSync( pdfFilePath, pdfBytes );
																																																const pdfFileName = `TransUnion_CreditReport.pdf`;
																																																const s3Path = `Agreements/${user.userReference}/${paymentmanagementdata.screentracking.applicationReference}/${pdfFileName}`;
																																																creditReportConsent = {
																																																	documentName: 'TransUnion_CreditReport',
																																																	documentKey: "07000",
																																																	documentVersion: '1',
																																																	phoneNumber: user.phoneNumber,
																																																	user: user.id,
																																																	screenid: paymentmanagementdata.screentracking.id,
																																																	agreementpath: s3Path
																																																};
																																																userconsents.push(creditReportConsent);
																																																await UserConsent.create( creditReportConsent );
																																																await S3Service.uploadFileToS3( { filePath: pdfFilePath, s3Path } );
																																															}
																																														} )
																																														.finally( () => {
																																															_.forEach(userconsents, function(userconsent) {
																																																if(userconsent.isConnexusDoc){
																																																	userconsent.agreementpath = Utils.getS3UrlCCUDocs(
																																																		userconsent.agreementpath
																																																	);
																																																}else{
																																																	if (userconsent.agreementpath) {
																																																		userconsent.agreementpath = Utils.getS3Url(userconsent.agreementpath);
																																																	}
																																																}
																																																userconsent.documentName = userconsent.documentName.replace(/PromissoryNote_/gi, 'Retail_Installment_Contract_');
																																															});
																																															sails.log.warn("finally")
																																															fs.unlink( pdfFilePath, () => {} );
																																															const responsedata = {
																																																userconsents: userconsents,
																																																interestRate: loaninterestrate.interestRate || 0.0,
																																																creditTier: creditTier,
																																																btrHasLength: btrHasLength,
																																																ruleDataHasLength: ruleDataHasLength,
																																																user: user,
																																																practicedata: screenPracticeRes.practicemanagement,
																																																profileImage: profileImage,
																																																accountDetail: accountDetail,
																																																paymentmanagementdata: paymentmanagementdata,
																																																achdocumentDetails: documentdata,
																																																pdfdocument: pdfdocument,
																																																documenttype: documenttype,
																																																loancount: loancount,
																																																logDetails: logArrayDetails,
																																																communicationDetails: responseArr,
																																																errorval: errorval,
																																																successmsg: successmsg,
																																																nextpaymentDate: nextpaymentDate,
																																																loanPaymentType: loanPaymentType,
																																																transactionStatus: transactionStatus,
																																																PaymentScheduleStatus: paymentmanagementdata.status,
																																																statusicon: statusicon,
																																																pendingSchedule: pendingSchedule,
																																																paidSchedule: paidSchedule,
																																																likersCount: paymentmanagementdata.story && paymentmanagementdata.story.likers ? paymentmanagementdata.story.likers.length : 0,
																																																dislikersCount: paymentmanagementdata.story && paymentmanagementdata.story.dislikers ? paymentmanagementdata.story.dislikers.length : 0,
																																																transData: transData,
																																																shwotransData: showtransData,
																																																annualIncome: annualIncomeAmount,
																																																monthlyIncomeAmount: monthlyIncomeAmount,
																																																totalbalance: totalbalance,
																																																selecttotal: sum,
																																																// obj:objectdatas,
																																																obj: objectdatas,
																																																dtiandoffers: dtiandoffers,
																																																schudlesmsg: schudlesmsg,
																																																makePaymentForStory: makePaymentForStory,
																																																makebuttonshow: makebuttonshow,
																																																momentDate: moment,
																																																vikingData: vikingResult,
																																																ipaddress: ip,
																																																lastlevel: lastlevel,
																																																vikingConfig: sails.config.vikingConfig,
																																																deniedfromapp: paymentmanagementdata.deniedfromapp,
																																																uploaddocmsg: uploaddocmsg,
																																																fromResetToPending: fromResetToPending,
																																																banksuccessmsg: banksuccessmsg,
																																																bankerror: bankerror,
																																																creditFileStatus: creditFileStatus,
																																																vikingPendingCount: totalrecords,
																																																changeincomemsg: changeincomemsg,
																																																payroll_detected: payroll_detected,
																																																vikingCreditAmt: vikingCreditAmt,
																																																ounterOfferdecline: counterOfferdecline,
																																																creditfilefound: creditfilefound,
																																																creditfilename: creditfilename,
																																																userfilloutmanually: userfilloutmanually,
																																																minloanamount: sails.config.plaid.minrequestedamount,
																																																maxloanamount: sails.config.plaid.maxrequestedamount,
																																																minincomeamount: sails.config.plaid.minincomeamount,
																																																maxaprrate: sails.config.plaid.maxApr,
																																																loanSetDateExist: loanSetDateExist,
																																																showApproveButton: showApproveButton,
																																																practiceDocResults: practiceDocResults,
																																																practiceAllResults: practiceAllResults,
																																																linkedpractices: linkedpractices,
																																																linkedstaffArr: linkedstaffArr,
																																																linkedDoctorArr: linkedDoctorArr,
																																																paymentdebitCount: paymentmanagementdata.usertransactions.length,
																																																incompleteloanCount: incompleteloanRes.length,
																																																loantermdetails: gradeResults,
																																																loansettingData: loansettingData,
																																																paymentDatediff: paymentDatediff,
																																																backviewType: backviewType,
																																																creditReports: comissionDetails,
																																																loanSetDateTime: loanSetDateTime,
																																																currentDateTime: currentDateTime,
																																																lockedToG: lockedToG,
																																																screentracking: paymentmanagementdata.screentracking, // needed for counter offer template
																																																achstatus: paymentmanagementdata.achstatus, // needed for counter offer template
																																																currentEmploymentHistory: employmentInfo, // For render employmentTab -- emplyment hisotry tag in back office
																																																DTItrade: DTItrade,
																																																getRuleEntry: getRuleEntry
																																															};
																																															res.view("admin/pendingach/achuserDetails", responsedata);
																																														} );
																																													} else {
																																														_.forEach(userconsents, function(userconsent) {
																																															if(userconsent.isConnexusDoc){
																																																userconsent.agreementpath = Utils.getS3UrlCCUDocs(
																																																	userconsent.agreementpath
																																																);
																																															}else{
																																																if (userconsent.agreementpath) {
																																																	userconsent.agreementpath = Utils.getS3Url(userconsent.agreementpath);
																																																}
																																															}
																																															userconsent.documentName = userconsent.documentName.replace(/PromissoryNote_/gi, 'Retail_Installment_Contract_');
																																														});
																																														const responsedata = {
																																															userconsents: userconsents,
																																															interestRate: loaninterestrate.interestRate || 0.0,
																																															creditTier: creditTier,
																																															btrHasLength: btrHasLength,
																																															ruleDataHasLength: ruleDataHasLength,
																																															user: user,
																																															practicedata: screenPracticeRes.practicemanagement,
																																															profileImage: profileImage,
																																															accountDetail: accountDetail,
																																															paymentmanagementdata: paymentmanagementdata,
																																															achdocumentDetails: documentdata,
																																															pdfdocument: pdfdocument,
																																															documenttype: documenttype,
																																															loancount: loancount,
																																															logDetails: logArrayDetails,
																																															communicationDetails: responseArr,
																																															errorval: errorval,
																																															successmsg: successmsg,
																																															nextpaymentDate: nextpaymentDate,
																																															loanPaymentType: loanPaymentType,
																																															transactionStatus: transactionStatus,
																																															PaymentScheduleStatus: paymentmanagementdata.status,
																																															statusicon: statusicon,
																																															pendingSchedule: pendingSchedule,
																																															paidSchedule: paidSchedule,
																																															likersCount: paymentmanagementdata.story && paymentmanagementdata.story.likers ? paymentmanagementdata.story.likers.length : 0,
																																															dislikersCount: paymentmanagementdata.story && paymentmanagementdata.story.dislikers ? paymentmanagementdata.story.dislikers.length : 0,
																																															transData: transData,
																																															shwotransData: showtransData,
																																															annualIncome: annualIncomeAmount,
																																															monthlyIncomeAmount: monthlyIncomeAmount,
																																															totalbalance: totalbalance,
																																															selecttotal: sum,
																																															// obj:objectdatas,
																																															obj: objectdatas,
																																															dtiandoffers: dtiandoffers,
																																															schudlesmsg: schudlesmsg,
																																															makePaymentForStory: makePaymentForStory,
																																															makebuttonshow: makebuttonshow,
																																															momentDate: moment,
																																															vikingData: vikingResult,
																																															ipaddress: ip,
																																															lastlevel: lastlevel,
																																															vikingConfig: sails.config.vikingConfig,
																																															deniedfromapp: paymentmanagementdata.deniedfromapp,
																																															uploaddocmsg: uploaddocmsg,
																																															fromResetToPending: fromResetToPending,
																																															banksuccessmsg: banksuccessmsg,
																																															bankerror: bankerror,
																																															creditFileStatus: creditFileStatus,
																																															vikingPendingCount: totalrecords,
																																															changeincomemsg: changeincomemsg,
																																															payroll_detected: payroll_detected,
																																															vikingCreditAmt: vikingCreditAmt,
																																															ounterOfferdecline: counterOfferdecline,
																																															creditfilefound: creditfilefound,
																																															creditfilename: creditfilename,
																																															userfilloutmanually: userfilloutmanually,
																																															minloanamount: sails.config.plaid.minrequestedamount,
																																															maxloanamount: sails.config.plaid.maxrequestedamount,
																																															minincomeamount: sails.config.plaid.minincomeamount,
																																															maxaprrate: sails.config.plaid.maxApr,
																																															loanSetDateExist: loanSetDateExist,
																																															showApproveButton: showApproveButton,
																																															practiceDocResults: practiceDocResults,
																																															practiceAllResults: practiceAllResults,
																																															linkedpractices: linkedpractices,
																																															linkedstaffArr: linkedstaffArr,
																																															linkedDoctorArr: linkedDoctorArr,
																																															paymentdebitCount: paymentmanagementdata.usertransactions.length,
																																															incompleteloanCount: incompleteloanRes.length,
																																															loantermdetails: gradeResults,
																																															loansettingData: loansettingData,
																																															paymentDatediff: paymentDatediff,
																																															backviewType: backviewType,
																																															creditReports: comissionDetails,
																																															loanSetDateTime: loanSetDateTime,
																																															currentDateTime: currentDateTime,
																																															lockedToG: lockedToG,
																																															screentracking: paymentmanagementdata.screentracking, // needed for counter offer template
																																															achstatus: paymentmanagementdata.achstatus, // needed for counter offer template
																																															currentEmploymentHistory: employmentInfo, // For render employmentTab -- emplyment hisotry tag in back office
																																															DTItrade: DTItrade,
																																															getRuleEntry: getRuleEntry
																																														};
																																														res.view("admin/pendingach/achuserDetails", responsedata);
																																													}
																																												}).catch((er) => {
																																													sails.log.error(er)
																																												});
																																											});
																																									});
																																								
																																							});

																																						
																																					});
																																				})
																																		});
																																});
																															});
																														});
																													});
																											});
																										});
																									});

																								})
																								.catch(function (err) {
																									sails.log.error("AchController#objectdataforpdf :: Error :: ", err);
																									res.view("admin/error/404", {
																										data: err.message,
																										layout: "layout"
																									});
																								});
																						})
																						.catch(function (err) {
																							sails.log.error("AchController#getAchUserDetailsAction :: Error :: ", err);
																							res.view("admin/error/404", {
																								data: err.message,
																								layout: "layout"
																							});
																						});
																				})
																				.catch(function (err) {
																					sails.log.error("AchController#getAchUserDetailsAction :: Error :: ", err);
																					const errors = err.message;
																					sails.log.error("AchController#getAchUserDetailsAction :: err", errors);
																					res.view("admin/error/404", {
																						data: err.message,
																						layout: "layout"
																					});
																				});
																		})
																		.catch(function (err) {
																			sails.log.error("AchController#getAchUserDetailsAction :: Error :: ", err);
																			const errors = err.message;
																			sails.log.error("AchController#getAchUserDetailsAction :: err", errors);
																			res.view("admin/error/404", {
																				data: err.message,
																				layout: "layout"
																			});
																		});
																})
																.catch(function (err) {
																	sails.log.error("AchController#getAchUserDetailsAction :: Error :: ", err);
																	const errors = err.message;
																	sails.log.error("AchController#getAchUserDetailsAction :: err", errors);
																	res.view("admin/error/404", {
																		data: err.message,
																		layout: "layout"
																	});
																});
														})
														.catch(function (err) {
															sails.log.error("AchController#getAchUserDetailsAction :: Error :: ", err);
															const errors = err.message;
															sails.log.error("AchController#getAchUserDetailsAction :: err", errors);
															res.view("admin/error/404", {
																data: err.message,
																layout: "layout"
															});
														});
												});
											})
											.catch(function (err) {
												sails.log.error("AchController#getAchUserDetailsAction :: Error :: ", err);
												const errors = err.message;
												sails.log.error("AchController#getAchUserDetailsAction :: err", errors);
												res.view("admin/error/404", {
													data: err.message,
													layout: "layout"
												});
											});
									})
									.catch(function (err) {
										sails.log.error("AchController#getAchUserDetailsAction :: Error :: ", err);
										const errors = err.message;
										sails.log.error("AchController#getAchUserDetailsAction :: err", errors);
										res.view("admin/error/404", {
											data: err.message,
											layout: "layout"
										});
									});
							}
						})
						.catch(function (err) {
							const errors = err.message;
							sails.log.error("AchController#getAchUserDetailsAction :: err", errors);
							res.view("admin/error/404", {
								data: err.message,
								layout: "layout"
							});
						});
				})
				.catch(function (err) {
					const errors = err.message;
					sails.log.error("AchController#getAchUserDetailsAction :: err", errors);
					res.view("admin/error/404", {
						data: err.message,
						layout: "layout"
					});
				});
		});
}



function denyUserLoanAction(req, res) {

	var payID = req.param('paymentID');
	var eligireply = req.param('eligiblereapply');
	var decline = req.param('decline');
	var declinereason = req.param('declinereason');

	if (payID) {

		var options = {
			id: payID
		};



		PaymentManagement.findOne(options)
			.populate('user')
			.then(function (paymentmanagementdata) {


				var userObjectData = paymentmanagementdata.user;

				paymentmanagementdata.achstatus = 2;
				paymentmanagementdata.isPaymentActive = false;
				paymentmanagementdata.eligiblereapply = eligireply;
				paymentmanagementdata.declineemail = decline;
				paymentmanagementdata.declinereason = declinereason;
				paymentmanagementdata.appverified = 1;
				paymentmanagementdata.status = "DENIED";

				paymentmanagementdata.save(function (err) {
					if (err) {
						var json = {
							status: 400,
							message: "Unable to decline loan. Try again!"
						};
						res.contentType('application/json');
						res.json(json);
					}
					else {


						var usercriteria = {
							id: paymentmanagementdata.user
						};

						User.findOne(usercriteria)
							.then(function (userdata) {

								/*userdata.isExistingLoan = false;*/
								//-- Added to choose new bank in front end
								/*userdata.isBankAdded = false;*/
								userdata.isUserProfileUpdated = false;

								userdata.save(function (err) {
									if (err) {
										var json = {
											status: 400,
											message: "Unable to decline loan. Try again!"
										};
										res.contentType('application/json');
										res.json(json);
									}

									//Log Activity
									var modulename = 'Loan denied';
									var modulemessage = 'Loan denied successfully';
									req.achlog = 1;
									req.payID = payID;
									req.logdata = paymentmanagementdata;

									// Comment section Start
									/*var allParams={
																		subject : modulename,
																		comments : modulemessage
																}
																var adminemail = req.user.email;
																Achcomments
																.createAchComments(allParams,payID,adminemail)
																.then(function (achcomments) {
																}).catch(function (err) {
																		sails.log.error("Loan denied createAchComments error::", err);
																});*/
									//Comment section end

									Logactivity.registerLogActivity(req, modulename, modulemessage);

									//EmailService.sendDenyLoanMail(userObjectData,paymentmanagementdata);
									var json = {
										status: 200,
										message: "Loan denied successfully"
									};
									res.contentType('application/json');
									res.json(json);
								});

							});
					}
				});

			})
			.catch(function (err) {
				var json = {
					status: 400,
					message: err.message
				};
				sails.log.error("json data", json);
				res.contentType('application/json');
				res.json(json);
			});
	}
	else {

		var json = {
			status: 400
		};
		sails.log.error("json data", json);
		res.contentType('application/json');
		res.json(json);
	}
}

function addAchCommentsAction(req, res) {

	var payID = req.param('paymentID');
	if (!req.form.isValid) {
		var validationErrors = ValidationService
			.getValidationErrors(req.form.getErrors());
		return res.failed(validationErrors);
	}
	var adminemail = req.user.email;
	Achcomments
		.createAchComments(req.form, payID, adminemail)
		.then(function (achcomments) {

			var modulename = 'Add pending applications Comment';
			var modulemessage = 'Pending applications comment added successfully';
			req.achlog = 1;
			req.logdata = req.form;
			req.payID = payID;
			Logactivity.registerLogActivity(req, modulename, modulemessage);

			var json = {
				status: 200,
				message: "Commente Added successfully"
			};
			res.contentType('application/json');
			res.json(json);

		})
		.catch(function (err) {
			sails.log.error('UniversityController#createUniversity :: err :', err);
			return res.handleError(err);
		});

}

/* Loan payment pro starts here */
function addnewCustomerAction(req, res) {
	/*var userData = {
				'FirstName' : 'Ram',
				'LastName' : 'Kumar',
				'Address1' : 'First lane,Chula Vista',
				'Address2' : '',
				'City' : 'San Diego',
				'State' : 'CA',
				'Zip' : '91910',
				'Country' : 'US',
				'Email' : 'itramkumar.78@gmail.com',
				'Phone' : '619-543-6222',
				'Mobile' : '619-543-6222'
			};*/

	var userData = {
		'FirstName': 'Bob',
		'LastName': 'Yakuza',
		'Address1': '893 Ginza',
		'Address2': '',
		'City': 'Austin',
		'State': 'TX',
		'Zip': '00893',
		'Country': 'US',
		'Email': 'rajrajan26@gmail.com',
		'Phone': '893-555-0893',
		'Mobile': '893-555-0893'
	};

	LoanProService.addCustomer(userData)
		.then(function (customerDetails) {
			if (customerDetails) {
				return res.success(customerDetails);
			}
		})
		.catch(function (err) {
			sails.log.error('AchController#addnewCustomerAction :: err :', err);
			return res.handleError(err);
		});
}

function addnewBankaccountAction(req, res) {

	var bankObject = {
		'AccountNumber': '1002587425',
		//'BankName' : 'chase',
		'NameOnAccount': 'Bob Yakuza',
		'RoutingNumber': '999999999'
	};
	//var customerToken="a68c2979-7426-4c29-9e99-abc27fb2d900";
	//var customerToken="4327a5f0-6087-417a-b38b-af0b16fd473a";
	//var customerToken="bb4e6290-77bb-4a1c-a875-40fc09d3760d";
	//var customerToken="2e0cbd9b-c628-4237-aa5c-8a1f58c01898";
	var customerToken = "1b2e41ea-6dc5-4621-aa4c-03f146900f6a";
	LoanProService.addNewBankPayment(customerToken, bankObject)
		.then(function (bankDetails) {
			if (bankDetails) {
				return res.success(bankDetails);
			}
		})
		.catch(function (err) {
			sails.log.error('AchController#addnewBankaccountAction :: err :', err);
			return res.handleError(err);
		});
}

function loanproCreditPaymentAction(req, res) {

	var userData = {
		'FirstName': 'Bob',
		'LastName': 'Yakuza',
		'Address1': '893 Ginza',
		'Address2': '',
		'City': 'Austin',
		'State': 'TX',
		'Zip': '00893',
		'Country': 'US',
		'Email': 'rajrajan26@gmail.com',
		'Phone': '893-555-0893',
		'Mobile': '893-555-0893'
	};

	var customerToken = "1b2e41ea-6dc5-4621-aa4c-03f146900f6a";
	var paymentToken = "30908738-c588-4bed-830c-d2c5ef025f92";

	var payObject = {
		'Amount': '5',
		'InvoiceId': 'FL1000',
		'TransactionDescription': 'ACH Loan Approval'
	};

	/*var payObject = {
						'Amount' : '5',
						'RoutingNumber': '999999999',
						'AccountNumber' : '1002587425',
						'Customer' : userData
					};*/

	LoanProService.processDebitPayment(customerToken, paymentToken, payObject)
		.then(function (paymentdata) {
			if (paymentdata) {
				return res.success(paymentdata);
			}
		})
		.catch(function (err) {
			sails.log.error('AchController#loanproCreditPaymentAction :: err :', err);
			return res.handleError(err);
		});
}


function checkAchTransactionDetailsAction(req, res) {

	var transId = '17400823';
	LoanProService.checkAchTransaction(transId)
		.then(function (transData) {
			if (transData) {
				return res.success(transData);
			}
		})
		.catch(function (err) {
			sails.log.error('AchController#checkAchTransactionDetailsAction :: err :', err);
			return res.handleError(err);
		});
}

/* Loan payment pro ends here */

function ajaxAchCommentsAction(req, res) {

	//var payID = req.param('id');
	var userId = req.param('id');

	//Sorting
	var colS = "";

	if (req.query.sSortDir_0 == 'desc') {
		sorttype = -1;
	}
	else {
		sorttype = 1;
	}
	switch (req.query.iSortCol_0) {
		case '0': var sorttypevalue = { '_id': sorttype }; break;
		case '1': var sorttypevalue = { 'subject': sorttype }; break;
		case '2': var sorttypevalue = { 'comments': sorttype }; break;
		case '3': var sorttypevalue = { 'adminemail': sorttype }; break;
		case '4': var sorttypevalue = { 'createdAt': sorttype }; break;
		default: break;
	};

	//Search
	if (req.query.sSearch) {
		var criteria = {
			//isDeleted: false,
			user: userId,
			or: [{ subject: { 'contains': req.query.sSearch } }, { comments: { 'contains': req.query.sSearch } }]
		};

	}
	else {
		var criteria = {
			user: userId,
			//isDeleted: false,
		};
	}


	Achcomments
		.find(criteria)
		.sort(sorttypevalue)
		.then(function (achcomments) {

			totalrecords = achcomments.length;
			//Filter by limit records
			skiprecord = parseInt(req.query.iDisplayStart);
			checklimitrecords = skiprecord + parseInt(req.query.iDisplayLength);
			if (checklimitrecords > totalrecords) {
				iDisplayLengthvalue = parseInt(totalrecords);
			}
			else {
				iDisplayLengthvalue = parseInt(req.query.iDisplayLength) + parseInt(skiprecord);
			}


			achcomments = achcomments.slice(skiprecord, iDisplayLengthvalue);

			var achcommentsDetails = [];
			achcomments.forEach(function (achcommentsdata, loopvalue) {
				loopid = loopvalue + skiprecord + 1;
				achcommentsdata.createdAt = moment(achcommentsdata.createdAt).tz("America/los_angeles").format('MM-DD-YYYY hh:mm:ss');
				achcommentsDetails.push({ loopid: loopid, subject: achcommentsdata.subject, comments: achcommentsdata.comments, adminemail: achcommentsdata.adminemail, createdAt: achcommentsdata.createdAt });
			});
			var json = {
				sEcho: req.query.sEcho,
				iTotalRecords: totalrecords,
				iTotalDisplayRecords: totalrecords,
				aaData: achcommentsDetails
			};
			res.contentType('application/json');
			res.json(json);
		});

}

function uploadDocumentProofAction(req, res) {
	const userId = req.param("userId");
	const screenId = req.param("screenId");
	const paymentID = req.param("paymentID");
	const category = req.param("category");
	const docutype = req.param("docutype");
	const localPath = req.localPath;
	let documentName = "";
	let redirectpath = "";
	let achdocuments = {};

	if (userId == "" || userId == null || "undefined" === typeof userId) {
		req.session.uploaddocmsg = 'Error in Uploading Document';
		if (category == "manageusers") {
			redirectpath = "/admin/viewUserDetails/" + userId;
		} else if (category == "incompleteusers") {
			redirectpath = "/admin/viewIncomplete/" + screenId;
		} else {
			redirectpath = "/admin/getAchUserDetails/" + paymentID;
		}
		return res.status(200).redirect(redirectpath);
	}

	if (docutype == "Others") {
		documentName = req.param("documentname");
		sails.log.info("documentName", documentName);
		if (!req.form.isValid) {
			var validationErrors = ValidationService.getValidationErrors(req.form.getErrors());
			return res.failed(validationErrors);
		}
	} else {
		documentName = req.param("docutype");
		sails.log.info("documentName1111", documentName);
	}

	const formdata = {
		docname: documentName,
		user: userId,
		screenTracking: screenId,
		underwriter: req.user.name
	};
	return Achdocuments.createAchDocuments(formdata)
		.then((_achdocuments) => {
			achdocuments = _achdocuments;
			return Screentracking.findOne({ user: userId })
				.sort("createdAt DESC")
				.populate("user")
		})
		.then(function (ScreentrackingData) {
			const applicationReference = ScreentrackingData.applicationReference;
			const userReference = ScreentrackingData.user.userReference;

			return Asset.createAssetForAchDocuments(achdocuments, localPath, userReference, applicationReference, Asset.ASSET_TYPE_USER_DOCUMENT)
		})
		.then(function (asset) {
			const docdetals = asset;
			docdetals.docs = achdocuments;
			req.achlog = 1;
			req.payID = paymentID;
			req.logdata = docdetals;
			const userCriteria = { id: userId };

			if (achdocuments.docname == sails.config.loanDetails.doctype1) {
				User.update(userCriteria, { isGovernmentIssued: true }).exec(function afterwards(err, updated) { });
			} else if (achdocuments.docname == sails.config.loanDetails.doctype2) {
				User.update(userCriteria, { isPayroll: true }).exec(function afterwards(err, updated) { });
			}

			return Achdocuments.updateDocumentProof(achdocuments, asset)
		})
		.then(function (value) {

			return Screentracking.checktodolistcount(userId)
		})
		.then(function (todo) {
			req.session.uploaddocmsg = "Documents updated successfully";

			Logactivity.registerLogActivity(req, "Upload  Documents", "Applications Documents updated successfully");

			const achDocCriteria = { id: achdocuments.id };

			if (paymentID != "" && paymentID != null && "undefined" !== typeof paymentID) {
				Achdocuments.update(achDocCriteria, { paymentManagement: paymentID }).exec(function afterwards(err, updated) { });
			}
			if (category == "manageusers") {
				redirectpath = "/admin/viewUserDetails/" + userId;
			} else if (category == "incompleteusers") {
				// HERE
				redirectpath = "/admin/viewIncomplete/" + screenId;
			} else {
				redirectpath = "/admin/getAchUserDetails/" + paymentID;
			}
			return res.status(200).redirect(redirectpath);
		})
		.catch(function (err) {
			sails.log.error("Ach#uploadAchDocuments  :: Error :: ", err);
			return reject({
				code: 500,
				message: "INTERNAL_SERVER_ERROR"
			});
		});
}


function defaultUsersAction(req, res) {

	res.view("admin/pendingach/defaultusers");

}

function ajaxDefaultUsersListAction(req, res) {


	var options = {
		status: 'OPENED',
		isPaymentActive: true,
		//achstatus: { $exists: true },
		achstatus: { $eq: 1, $exists: true },
	};

	PaymentManagement.find(options)
		.populate('user')
		.exec(function (err, paymentmanagementdata) {
			if (err) {
				res.send(500, { error: 'DB error' });
			} else {

				if (req.query.sSortDir_0 == 'desc') {

					switch (req.query.iSortCol_0) {
						case '0': paymentmanagementdata = _.sortBy(paymentmanagementdata, '_id').reverse(); break;
						case '1': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'loanReference').reverse(); break;
						case '2': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.name').reverse(); break;
						case '3': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.email').reverse(); break;
						case '4': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.phoneNumber').reverse(); break;
						case '5': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'payOffAmount').reverse(); break;
						case '6': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'maturityDate').reverse(); break;
						case '7': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'createdAt').reverse(); break;
						default: break;
					};

				}
				else {
					switch (req.query.iSortCol_0) {
						case '0': paymentmanagementdata = _.sortBy(paymentmanagementdata, '_id'); break;
						case '1': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'loanReference'); break;
						case '2': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.name'); break;
						case '4': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.email'); break;
						case '5': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.phoneNumber'); break;
						case '6': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'payOffAmount'); break;
						case '7': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'maturityDate'); break;
						case '8': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'createdAt'); break;
						default: break;
					};
				}




				paymentmanagementdata = _.filter(paymentmanagementdata, function (item) {
					var paydate = item.paymentSchedule;
					if (paydate.length > 0) {
						var paystatusvalue = 0;
						paydate.forEach(function (paymentdate, datevalue) {
							var todaysDate = moment().startOf('day').toDate().getTime();
							//var scheduleDate = moment(paymentdate.date).startOf('day').toDate().getTime();
							var scheduleDate = moment(paymentdate.date).add(2, 'days').startOf('day').toDate().getTime();
							//sails.log.info("todaysDate",todaysDate);
							//sails.log.info("scheduleDate",scheduleDate);
							if (scheduleDate <= todaysDate && paymentdate.status == 'OPENED') {
								paystatusvalue = 1;
							}
						});
						if (paystatusvalue == 1) {
							return true;
						}

					}

				});



				//Filter user details not available
				paymentmanagementdata = _.filter(paymentmanagementdata, function (item) {
					if (item.user) {
						return true;
					}
				});

				//Filter using search data
				if (req.query.sSearch) {
					var search = req.query.sSearch.toLowerCase();
					paymentmanagementdata = _.filter(paymentmanagementdata, function (item) {

						if (item.loanReference != null) {
							if (item.loanReference.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}

						if (item.user.name != null) {
							if (item.user.name.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}

						/* if(item.user.screenName!=null)
						 {
								 if(item.user.screenName.toLowerCase().indexOf(search)>-1 )
							 {
								 return true;
							 }
						 }*/
						if (item.user.email != null) {
							if (item.user.email.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}
						if (item.user.phoneNumber != null) {
							if (item.user.phoneNumber.indexOf(search) > -1) {
								return true;
							}
						}

						if (item.payOffAmount != null) {
							if (parseInt(item.payOffAmount) == parseInt(search)) {
								return true;
							}
						}

						if (item.maturityDate != null) {
							if (moment(item.maturityDate).format('MM-DD-YYYY') == search) {
								return true;
							}
						}


						if (item.createdAt != null) {
							if (moment(item.createdAt).format('MM-DD-YYYY') == search) {
								return true;
							}
						}


						return false;
					});
				}

				//total records count
				totalrecords = paymentmanagementdata.length;

				//Filter by limit records
				var p = parseInt(req.query.iDisplayStart) + 1;
				skiprecord = parseInt(req.query.iDisplayStart);
				checklimitrecords = skiprecord + parseInt(req.query.iDisplayLength);
				if (checklimitrecords > totalrecords) {
					iDisplayLengthvalue = totalrecords;
				}
				else {
					//iDisplayLengthvalue=req.query.iDisplayLength;
					iDisplayLengthvalue = parseInt(req.query.iDisplayLength) + parseInt(skiprecord);
				}
				paymentmanagementdata = paymentmanagementdata.slice(skiprecord, iDisplayLengthvalue);


				//Final output starts here
				var pendinguser = [];
				paymentmanagementdata.forEach(function (paydata, loopvalue) {



					loopid = loopvalue + skiprecord + 1;

					var payuserName = '';
					var payuserscreenName = '';
					var payuserEmail = '';
					var payuserphoneNumber = '';
					if (paydata.user) {
						if (paydata.user.firstname != '' && paydata.user.firstname != null) {
							var payuserName = paydata.user.firstname + " " + paydata.user.lastname;
						}
						/*if(paydata.user.screenName!='' && paydata.user.screenName!=null)
						{
							var payuserscreenName=paydata.user.screenName;
						}*/
						if (paydata.user.email != '' && paydata.user.email != null) {
							var payuserEmail = paydata.user.email;
						}
						if (paydata.user.phoneNumber != '' && paydata.user.phoneNumber != null) {
							var payuserphoneNumber = paydata.user.phoneNumber;
						}
					}
					if ("undefined" === typeof paydata.loanReference || paydata.loanReference == '' || paydata.loanReference == null) {
						paydata.loanReference = '--';
					}

					if ("undefined" === typeof paydata.user.firstname || paydata.user.firstname == '' || paydata.user.firstname == null) {
						paydata.user.name = '--';
					}
					if ("undefined" === typeof paydata.user.email || paydata.user.email == '' || paydata.user.email == null) {
						paydata.user.email = '--';
					}

					paydata.maturityDate = moment(paydata.maturityDate).format('MM-DD-YYYY');
					paydata.createdAt = moment(paydata.createdAt).tz("America/los_angeles").format('MM-DD-YYYY hh:mm:ss');

					systemUniqueKeyURL = 'getAchUserDetails/' + paydata.id;

					var payuserNameLink = payuserName;

					if (payuserEmail) {
						var emillnk = '<a href="mailto:' + payuserEmail + '">' + payuserEmail + '</a>';
					}
					statusicon = ' <a href="/admin/viewDefaultUser/' + paydata.id + '"><i class="fa fa-eye" aria-hidden="true" style="cursor:pointer;color:#337ab7;"></i></a>';

					var paymentSchedulearray = paydata.paymentSchedule;
					if (paymentSchedulearray.length > 0) {
						var applicationstatus = '';
						var lateloanstatus = '';
						var todaysDate = moment().startOf('day').toDate().getTime();
						paymentSchedulearray.forEach(function (payschedule, loopvalue1) {
							var loopid = loopvalue1 + 1;
							var financedAmount = payschedule.amount;
							var loandate = payschedule.date;
							var loanstatus = payschedule.status;
							var scheduleDate = moment(payschedule.date).add(2, 'days').startOf('day').toDate().getTime();
							//Need to update in Defaulteduserconroller for late payment date

							if (scheduleDate < todaysDate && loanstatus == 'OPENED') {
								applicationstatus = "Schedule" + loopid + " <br> Late";
								lateloanstatus = "<b>" + financedAmount + "</b> " + moment(loandate).format('MM-DD-YYYY');
							}

						});
					} else {
						var applicationstatus = "--";
						var lateloanstatus = "--";
					}

					systemDefaultURL = 'viewDefaultUser/' + paydata.id;
					if (paydata.loanReference != '' && paydata.loanReference != null) {
						var payloanReference = '<a href=\'' + systemDefaultURL + '\'>' + paydata.loanReference + '</a>';
					} else {
						var payloanReference = '--';
					}

					remainderbtn = '<button type="button" class="btn btn-primary" onclick="senddefaultuserremainder(\'' + paydata.id + '\',\'' + paydata.user.id + '\');">Send</button>';

					/*remainderbtn =' <a href="/admin/loanofferinfo/'+screentrackingdata.id+'"><i class="fa fa-money" aria-hidden="true" style="cursor:pointer;color:#337ab7;"></i></a> &nbsp;&nbsp;<input type="checkbox" id="screenlist" name="screenlist[]" value="'+screentrackingdata.id+'">';	*/


					pendinguser.push({ loopid: loopid, loanReference: payloanReference, name: payuserNameLink, email: payuserEmail, phoneNumber: payuserphoneNumber, payOffAmount: paydata.payOffAmount, maturityDate: paydata.maturityDate, createdAt: paydata.createdAt, loanstatus: lateloanstatus, appstatus: applicationstatus, remainderbtn: remainderbtn, status: statusicon, });
				});

				var json = {
					sEcho: req.query.sEcho,
					iTotalRecords: totalrecords,
					iTotalDisplayRecords: totalrecords,
					aaData: pendinguser
				};
				res.contentType('application/json');
				res.json(json);
			}
		});
}

function viewDefaultUserAction(req, res) {

	var payID = req.param('id');
	console.log("payID:", payID);

	if (!payID) {
		var errors = {
			"code": 500,
			"message": "Invalid Data"
		};
		sails.log.error('AchController#viewDefaultUserAction :: errors', errors);
		res.view("admin/error/500", {
			data: errors.message,
			layout: 'layout'
		});
	}

	var options = {
		id: payID
	};

	PaymentManagement.findOne(options)
		.populate('story')
		.then(function (paymentmanagementdata) {

			//sails.log.info('paymentmanagementdata Details: ', paymentmanagementdata);

			var checkpaymentSchedule = _.orderBy(paymentmanagementdata.paymentSchedule, ['date'], ['asc']);

			//-- loan full amount
			var payOffAmount = 0;
			var totalAmountDue = 0;
			_.forEach(paymentmanagementdata.paymentSchedule, function (newschedulerdata) {
				if (newschedulerdata.status == "OPENED" || newschedulerdata.status == 'CURRENT') {
					totalAmountDue = paymentmanagementdata.paymentSchedule[0].amount;
					payOffAmount = parseFloat(payOffAmount) + parseFloat(newschedulerdata.amount);
				}

			})

			if (paymentmanagementdata.amount) {
				var financedAmount = paymentmanagementdata.amount;
			}
			else {
				var financedAmount = paymentmanagementdata.payOffAmount;
			}

			if (paymentmanagementdata.interestapplied) {
				var interestRate = paymentmanagementdata.interestapplied;
			}
			else {
				var interestRate = 0;
			}

			var todaysDateFormat = moment().startOf('day').format('MM-DD-YYYY');
			var todaysMonth = moment().startOf('day').format('M');
			var currentDay = moment().startOf('day').format('D');
			var maturityDate = moment(paymentmanagementdata.maturityDate).startOf('day').toDate().getTime();
			fullPayoffAmount = 0;
			fullPayoffMonth = 0;
			finalinterestAmount = 0;
			totalinterestDays = 0;
			paidterms = 0;
			interestApplied = 0;
			chargeinterestDays = 0;
			minimumAmount = 0;

			var actualStartBalanceAmount = 0;
			var latePrincipalAmount = 0;

			if (interestRate > 0) {
				//sails.log.info("checkpaymentSchedule:: ", checkpaymentSchedule);

				_.forEach(checkpaymentSchedule, function (scheduler) {

					if (minimumAmount == 0) {
						minimumAmount = scheduler.interestAmount;
					}
					if (scheduler.status == "OPENED" || scheduler.status == 'CURRENT' || scheduler.status == 'LATE') {
						if (scheduler.amount > 0) {
							interestAmount = scheduler.interestAmount;
							startBalanceAmount = scheduler.startBalanceAmount;
							var nextMonthDate = moment(scheduler.date).startOf('day').toDate();
							var nextMonthDateValue = moment(nextMonthDate).startOf('day').toDate().getTime();
							var todaysDate = moment(new Date());
							var todaysDateValue = moment().startOf('day').toDate().getTime();
							var schedulerDate = moment(scheduler.date).startOf('day').toDate();
							var lastpaidDate = moment(scheduler.lastpaiddate).startOf('day').toDate();
							var lastpaidDateValue = moment(scheduler.lastpaiddate).startOf('day').toDate().getTime();

							if (todaysDateValue >= nextMonthDateValue && todaysDateValue <= maturityDate) {
								finalinterestAmount = parseFloat(finalinterestAmount) + parseFloat(interestAmount);
								latePrincipalAmount = parseFloat(latePrincipalAmount) + parseFloat(scheduler.principalAmount);
							}
							else {
								if (nextMonthDateValue > todaysDateValue && todaysDateValue <= maturityDate) {
									if (interestApplied == 0) {
										actualStartBalanceAmount = parseFloat(startBalanceAmount);

										oDate = moment(lastpaidDate);
										diffDays = oDate.diff(todaysDate, 'days');
										totalinterestDays = Math.abs(diffDays);

										sDate = moment(schedulerDate);
										sdiffDays = sDate.diff(lastpaidDate, 'days');
										sdiffDays = Math.abs(sdiffDays);
										sdiffDays = 14;

										//	sails.log.info("interestAmount: info: ",interestAmount);
										//	sails.log.info("sdiffDays: info: ",sdiffDays);

										dayinterestAmount = interestAmount / sdiffDays;
										chargeinterestDays = totalinterestDays;

										//sails.log.info("dayinterestAmount: info: ",dayinterestAmount);

										if (todaysDateValue < lastpaidDateValue) {
											chargeinterestDays = 0;
										}
										else {
											if (chargeinterestDays <= 0) {
												if (scheduler.lastpaidcount == 1 && todaysDateValue == lastpaidDateValue) {
													chargeinterestDays = 0;
												}
												else {
													chargeinterestDays = 1;
												}
											}
											else {
												if (scheduler.lastpaidcount == 1) {
													chargeinterestDays = parseInt(chargeinterestDays);
												}
												else {
													chargeinterestDays = parseInt(chargeinterestDays) + 1;
												}
											}
										}

										totalinterestDaysAmount = dayinterestAmount * chargeinterestDays;
										finalinterestAmount = parseFloat(finalinterestAmount) + parseFloat(totalinterestDaysAmount);
										interestApplied = 1;

									}
								}
							}
						}
					}

					if (scheduler.status == "PAID OFF") {
						paidterms = parseInt(paidterms) + 1;
					}
				});

				//-- Sum interest amount and late prinicpal
				if (parseFloat(fullPayoffAmount) >= 0) {
					fullPayoffAmount = parseFloat(actualStartBalanceAmount) + parseFloat(latePrincipalAmount);
				}

				if (parseFloat(fullPayoffAmount) > 0) {
					fullPayoffAmount = parseFloat(fullPayoffAmount);

					if (parseFloat(finalinterestAmount) > 0) {
						fullPayoffAmount = parseFloat(fullPayoffAmount) + parseFloat(finalinterestAmount);
					}
				}

				fullPayoffAmount = parseFloat(fullPayoffAmount.toFixed(2));
			}
			else {
				fullPayoffAmount = parseFloat(paymentmanagementdata.payOffAmount);
			}

			//user criteria
			var criteria = {
				_id: paymentmanagementdata.user,
			};

			User
				.findOne(criteria)
				.then(function (user) {
					if (!user) {
						var errors = {
							"code": 404,
							"message": "User not found"
						};
						sails.log.error('AchController#viewDefaultUserAction :: errors', errors);
						res.view("admin/error/404", {
							data: errors.message,
							layout: 'layout'
						});
					}
					else {
						var profileImage;

						if (user.profilePicture) {
							profileImage = user.profilePicture.toApi();
						} else {
							profileImage = "";
						}

						//--Account criteria updated
						var criteria = {
							user: user.id,
							id: paymentmanagementdata.account
						};
						Account
							.find(criteria)
							.populate('userbankAccount') 
							.then(function (accountDetail) {

								var accountuserbank = accountDetail[0].userBankAccount.id;
								var institutionTypeId = accountDetail[0].institutionType;
								var linkedaccountName = accountDetail[0].accountName;
								var linkedaccountNumber = accountDetail[0].accountNumber;

								_.forEach(accountDetail, function (accountvalue) {

									if (accountvalue.accountNumber) {
										var str = accountvalue.accountNumber;
										accountvalue.accountNumber = str.replace(/\d(?=\d{4})/g, "X");
										var otheraccounts = accountvalue.userBankAccount.accounts;
										_.forEach(otheraccounts, function (otheraccountvalue) {
											if (otheraccountvalue.numbers) {
												var str1 = otheraccountvalue.numbers.account;
												if ("undefined" !== typeof str1 && str1 != '' && str1 != null) {
													otheraccountvalue.numbers.account = str1.replace(/\d(?=\d{4})/g, "X");
												}
											}
										})
									}
								})

								Achdocuments
									.find({ paymentManagement: payID })
									.populate('proofdocument')
									.then(function (documentdata) {

										_.forEach(documentdata, function (documentvalue) {
											//sails.log.info("documentvalue: ",documentvalue.proofdocument);
											if (documentvalue.proofdocument.isImageProcessed) {
												documentvalue.proofdocument.standardResolution = Utils.getS3Url(documentvalue.proofdocument.standardResolution);
											}
										})

										var todaysDate = moment().startOf('day').toDate().getTime();
										setcurrent = 0;
										var nextpaymentDate = '--';
										var pendingSchedule = [];
										var paidSchedule = [];

										_.forEach(paymentmanagementdata.paymentSchedule, function (chargeoffvalue) {

											var paydate = moment(chargeoffvalue.date).add(1, 'days').startOf('day').toDate().getTime();
											var chargeoffdate = moment(chargeoffvalue.date).add(1, 'days').startOf('day').toDate().getTime();


											if (chargeoffvalue.status == "PAID OFF") {
												paidSchedule.push(chargeoffvalue);
											}
											else {
												pendingSchedule.push(chargeoffvalue);
											}

											if (chargeoffvalue.chargeoff == 1) {
												chargeoffvalue.status = "Charge Off";
											}
											else {
												if (paydate < todaysDate && chargeoffvalue.status == 'OPENED') {
													chargeoffvalue.status = "Late";
													if (chargeoffdate < todaysDate) {
														chargeoffvalue.chargeoffres = "Yes";
													}
													else {
														chargeoffvalue.chargeoffres = "No";
													}
												}
												else if (chargeoffvalue.status == "OPENED" && setcurrent == 0) {
													chargeoffvalue.status = "Current";
													setcurrent = setcurrent + 1;
													chargeoffvalue.chargeoffres = "No";
													nextpaymentDate = moment(chargeoffvalue.date).format('LL');
												}
												else if (chargeoffvalue.status == "PAID OFF") {
													chargeoffvalue.status = "Paid Off";
													chargeoffvalue.chargeoffres = "No";
												}
												else {
													chargeoffvalue.status = "Schedule";
													chargeoffvalue.chargeoffres = "No";
												}
											}
											chargeoffvalue.date = moment(chargeoffvalue.date).format('LL');
										})

										paymentmanagementdata.maturityDate = moment(paymentmanagementdata.maturityDate).format('LL');
										paymentmanagementdata.nextPaymentSchedule = moment(paymentmanagementdata.nextPaymentSchedule).format('LL');

										if (!paymentmanagementdata.interestapplied) {
											paymentmanagementdata.interestapplied = feeManagement.interestRate;
										}

										if (!paymentmanagementdata.loantermcount) {
											paymentmanagementdata.loantermcount = feeManagement.loanTerm;
										}

										_.forEach(paymentmanagementdata.usertransactions, function (reapayment) {
											reapayment.amount = parseFloat(reapayment.amount).toFixed(2);
											reapayment.date = moment(reapayment.date).format('LL');
										});

										//--Actual timestamp
										user.createdAt = moment(user.createdAt).format('LLL');
										user.updatedAt = moment(user.updatedAt).format('LLL');


										//sails.log.info("paymentschulde: ",paymentmanagementdata.paymentSchedule);
										var errorval = '';
										var successval = '';
										if (req.session.chargeerror != '') {
											errorval = req.session.chargeerror;
											req.session.chargeerror = '';
										}

										if (req.session.chargesuccess != '') {
											successval = req.session.chargesuccess;
											req.session.chargesuccess = '';
										}

										var repullpayerrorval = '';
										var repullpaysuccessval = '';

										if (req.session.repullpayerrormsg != '') {
											repullpayerrorval = req.session.repullpayerrormsg;
											req.session.repullpayerrormsg = '';
										}

										if (req.session.repullpaysucessmsg != '') {
											repullpaysuccessval = req.session.repullpaysucessmsg;
											req.session.repullpaysucessmsg = '';
										}

										var defaultschudleerrormsg = '';
										var defaultschudlesucessmsg = '';

										if (req.session.defaultschudleerrormsg != '') {
											defaultschudleerrormsg = req.session.defaultschudleerrormsg;
											req.session.defaultschudleerrormsg = '';
										}

										if (req.session.defaultschudlesucessmsg != '') {
											defaultschudlesucessmsg = req.session.defaultschudlesucessmsg;
											req.session.defaultschudlesucessmsg = '';
										}

										var schudlesmsg = '';
										var schudleerrormsg = '';
										var defaultmakepaymentsuccessmsg = '';
										var defaultmakepaymenterrormsg = '';

										if (req.session.schudlesmsg != '') {
											defaultmakepaymentsuccessmsg = req.session.schudlesmsg;
											req.session.schudlesmsg = '';
										}

										if (req.session.schudleerrormsg != '') {
											defaultmakepaymenterrormsg = req.session.schudleerrormsg;
											req.session.schudleerrormsg = '';
										}

										PlaidUser
											.find({ userBankAccount: accountuserbank })
											.then(function (plaidDetails) {

												var institutionName = '';
												Institution
													.findOne({ institutionType: institutionTypeId })
													.then(function (institutionData) {

														if (institutionData) {
															var institutionName = institutionData.institutionName;
														}

														var repullcriteria = {
															user: user.id,
															userBankAccount: accountuserbank,
														};

														Repullbankaccount
															.find(repullcriteria)
															.populate('userBankAccount')
															.sort({ 'createdAt': -1 })
															.then(function (repullDetails) {


																_.forEach(repullDetails, function (repullaccountvalue) {

																	delete repullaccountvalue.userBankAccount;

																	repullaccountvalue.createdAt = moment(repullaccountvalue.createdAt).format("LL");

																	//sails.log.info("repullaccountvalue::",repullaccountvalue);


																	if (repullaccountvalue.accountNumber) {
																		var repullstr = repullaccountvalue.accountNumber;

																		//sails.log.info("repullstr::",repullstr);
																		repullaccountvalue.accountNumber = repullstr.replace(/\d(?=\d{4})/g, "X");

																		//sails.log.info("repullaccountvalue.accountNumber::",repullaccountvalue.accountNumber);
																	}

																	_.forEach(repullaccountvalue.accountsData, function (subrepullaccountvalue) {
																		if (subrepullaccountvalue.numbers) {
																			var subrepullstr = subrepullaccountvalue.numbers.account;
																			if ("undefined" !== typeof subrepullstr && subrepullstr != '' && subrepullstr != null) {
																				subrepullaccountvalue.numbers.account = subrepullstr.replace(/\d(?=\d{4})/g, "X");
																			}
																		}
																	});

																	// sails.log.info("===========================================");
																});


																var accountNumberArray = [];
																var accountDataArray = [];
																var accountcriteria = {
																	user: paymentmanagementdata.user,
																};

																Account
																	.find(accountcriteria)
																	.sort('createdAt DESC')
																	.then(function (accountDetailInfo) {

																		_.forEach(accountDetailInfo, function (accountData) {

																			var accountNumberData = accountData.accountNumber;
																			var arrayres = accountNumberArray.indexOf(accountNumberData);
																			var accountStatus = 0;

																			if (arrayres == '-1') {

																				accountNumberArray.push(accountNumberData);

																				if (accountNumberData == paymentmanagementdata.account.accountNumber) {
																					accountStatus = '1';
																				}

																				//-- Added for ticket no 920
																				var allowBank = 0;
																				if (accountData.achprocessType == 'card') {
																					accountData.institutionType = accountData.accountName;

																					var customertoken = accountData.customertoken;
																					var paymenttoken = accountData.paymenttoken;

																					if ("undefined" !== typeof customertoken && customertoken != '' && customertoken != null && "undefined" !== typeof paymenttoken && paymenttoken != '' && paymenttoken != null) {
																						allowBank = 1;
																					}
																				}
																				else {
																					allowBank = 1;
																				}

																				if (allowBank == 1) {
																					var accountObject = {
																						accountID: accountData.id,
																						accountName: accountData.accountName,
																						accountNumberLastFour: accountData.accountNumberLastFour,
																						institutionType: accountData.institutionType,
																						accountStatus: accountStatus,
																						achprocessType: accountData.achprocessType
																					};
																					accountDataArray.push(accountObject);
																				}
																			}
																		});


																		PaymentManagement
																			.userAccountInfoDetail(accountDataArray)
																			.then(function (accountDataArray) {

																				accountDataArray = _.orderBy(accountDataArray, ['accountStatus'], ['desc']);

																				Makepayment
																					.getFullpayment(paymentmanagementdata.id)
																					.then(function (makePaymentForStory) {


																						var makebuttonshow = 'no';
																						if (makePaymentForStory.code == 200) {

																							var todayDate = moment().startOf('day').format();
																							if ("undefined" !== typeof paymentmanagementdata.makepaymentdate && paymentmanagementdata.makepaymentdate != '' && paymentmanagementdata.makepaymentdate != null) {
																								var lastpaiddate = paymentmanagementdata.makepaymentdate;
																							} else {
																								var lastpaiddate = paymentmanagementdata.paymentSchedule[0].lastpaiddate;
																							}
																							var makepaymentDate = moment(lastpaiddate).startOf('day').format();

																							sails.log.error("makepaymentDate", makepaymentDate);
																							sails.log.error("todayDate", todayDate);

																							if (todayDate >= makepaymentDate) {
																								makebuttonshow = 'yes';
																							}
																						}
																						var vikingCriteria = { payment_id: paymentmanagementdata.id, userId: paymentmanagementdata.user, processType: 4 };

																						VikingRequest.find(vikingCriteria).sort("scheduleDate").then(function (vikingData) {
																							//sails.log.info("----",vikingData);


																							var responsedata = {
																								user: user,
																								profileImage: profileImage,
																								accountDetail: accountDetail,
																								paymentmanagementdata: paymentmanagementdata,
																								achdocumentDetails: documentdata,
																								todaysDate: todaysDate,
																								chargeerror: errorval,
																								chargesuccess: successval,
																								nextpaymentDate: nextpaymentDate,
																								pendingSchedule: pendingSchedule,
																								paidSchedule: paidSchedule,
																								plaidDetails: plaidDetails,
																								institutionTypeId: institutionTypeId,
																								institutionName: institutionName,
																								userbankaccountID: accountuserbank,
																								repullDetails: repullDetails,
																								repullCount: repullDetails.length,
																								repullpayerrorval: repullpayerrorval,
																								repullpaysuccessval: repullpaysuccessval,
																								defaultschudlesucessmsg: defaultschudlesucessmsg,
																								defaultschudleerrormsg: defaultschudleerrormsg,
																								fullPayoffAmount: fullPayoffAmount,
																								minimumAmount: minimumAmount,
																								accountDataArray: accountDataArray,
																								defaultmakepaymentsuccessmsg: defaultmakepaymentsuccessmsg,
																								defaultmakepaymenterrormsg: defaultmakepaymenterrormsg,
																								moment: moment,
																								makePaymentForStory: makePaymentForStory,
																								makebuttonshow: makebuttonshow,
																								vikingConfig: sails.config.vikingConfig,
																								momentDate: moment,
																								vikingData, vikingData
																							};

																							//sails.log.info('AchController#getAchUserDetailsAction :: responsedata', responsedata);
																							res.view("admin/pendingach/viewDefaultUser", responsedata);
																						})
																							.catch(function (err) {
																								sails.log.error('AchController#fetchVikingData :: Error :: ', err);
																								var errors = err.message;
																								sails.log.error('AchController#fetchVikingData :: err', errors);
																								res.view("admin/error/404", {
																									data: err.message,
																									layout: 'layout'
																								});
																							});
																					})
																					.catch(function (err) {
																						sails.log.error('AchController#viewDefaultUserAction :: Error :: ', err);
																						var errors = err.message;
																						sails.log.error('AchController#viewDefaultUserAction :: err', errors);
																						res.view("admin/error/404", {
																							data: err.message,
																							layout: 'layout'
																						});
																					});

																			})
																			.catch(function (err) {
																				sails.log.error('AchController#viewDefaultUserAction :: Error :: ', err);
																				var errors = err.message;
																				sails.log.error('AchController#viewDefaultUserAction :: err', errors);
																				res.view("admin/error/404", {
																					data: err.message,
																					layout: 'layout'
																				});

																			});
																	})
																	.catch(function (err) {
																		sails.log.error('AchController#viewDefaultUserAction :: Error :: ', err);
																		var errors = err.message;
																		sails.log.error('AchController#viewDefaultUserAction :: err', errors);
																		res.view("admin/error/404", {
																			data: err.message,
																			layout: 'layout'
																		});
																	});
															})
															.catch(function (err) {
																sails.log.error('AchController#viewDefaultUserAction :: Error :: ', err);
																var errors = err.message;
																sails.log.error('AchController#viewDefaultUserAction :: err', errors);
																res.view("admin/error/404", {
																	data: err.message,
																	layout: 'layout'
																});
															});
													})
													.catch(function (err) {
														sails.log.error('AchController#viewDefaultUserAction :: Error :: ', err);
														var errors = err.message;
														sails.log.error('AchController#viewDefaultUserAction :: err', errors);
														res.view("admin/error/404", {
															data: err.message,
															layout: 'layout'
														});
													});
											})
											.catch(function (err) {
												sails.log.error('AchController#viewDefaultUserAction :: Error :: ', err);
												var errors = err.message;
												sails.log.error('AchController#viewDefaultUserAction :: err', errors);
												res.view("admin/error/404", {
													data: err.message,
													layout: 'layout'
												});
											});
									})
									.catch(function (err) {
										sails.log.error('AchController#viewDefaultUserAction :: Error :: ', err);
										var errors = err.message;
										sails.log.error('AchController#viewDefaultUserAction :: err', errors);
										res.view("admin/error/404", {
											data: err.message,
											layout: 'layout'
										});
									});
							})
							.catch(function (err) {
								sails.log.error('AchController#viewDefaultUserAction :: Error :: ', err);
								var errors = err.message;
								sails.log.error('AchController#viewDefaultUserAction :: err', errors);
								res.view("admin/error/404", {
									data: err.message,
									layout: 'layout'
								});
							});
					}
				})
				.catch(function (err) {
					var errors = err.message;
					sails.log.error('AchController#viewDefaultUserAction :: err', errors);
					res.view("admin/error/404", {
						data: err.message,
						layout: 'layout'
					});
				});


		})
		.catch(function (err) {
			var errors = err.message;
			sails.log.error('AchController#viewDefaultUserAction :: err', errors);
			res.view("admin/error/404", {
				data: err.message,
				layout: 'layout'
			});
		});
}

function showAllCompleteAction(req, res) {
	var errorval = '';
	var successval = '';
	var newLoanupdateSuccessMsg = '';
	var newLoanupdateMsg = '';
	if (req.session.approveerror != '') {
		errorval = req.session.approveerror;
		req.session.approveerror = '';
	}
	if (req.session.successmsg != '') {
		successval = req.session.successmsg;
		req.session.successmsg = '';
	}
	if ("undefined" !== typeof req.session.newLoanupdateSuccessMsg && req.session.newLoanupdateSuccessMsg != '' && req.session.newLoanupdateSuccessMsg != null) {
		newLoanupdateSuccessMsg = req.session.newLoanupdateSuccessMsg;
		req.session.newLoanupdateSuccessMsg = '';
	}
	if ("undefined" !== typeof req.session.newLoanupdateMsg && req.session.newLoanupdateMsg != '' && req.session.newLoanupdateMsg != null) {
		newLoanupdateMsg = req.session.newLoanupdateMsg;
		req.session.newLoanupdateMsg = '';
	}
	//req.session.viewType="approvedContract"
	var responsedata = {
		approveerror: errorval,
		approvesuccess: successval,
		newLoanupdateMsg: newLoanupdateMsg,
		newLoanupdateSuccessMsg: newLoanupdateSuccessMsg
	};
	res.view("admin/pendingach/completeachlist", responsedata);
}
function showAllInprogressAction(req, res) {
	var errorval = '';
	var successval = '';
	var newLoanupdateSuccessMsg = '';
	var newLoanupdateMsg = '';

	if (req.session.approveerror != '') {
		errorval = req.session.approveerror;
		req.session.approveerror = '';
	}
	if (req.session.successmsg != '') {
		successval = req.session.successmsg;
		req.session.successmsg = '';
	}

	if ("undefined" !== typeof req.session.newLoanupdateSuccessMsg && req.session.newLoanupdateSuccessMsg != '' && req.session.newLoanupdateSuccessMsg != null) {
		newLoanupdateSuccessMsg = req.session.newLoanupdateSuccessMsg;
		req.session.newLoanupdateSuccessMsg = '';
	}
	if ("undefined" !== typeof req.session.newLoanupdateMsg && req.session.newLoanupdateMsg != '' && req.session.newLoanupdateMsg != null) {
		newLoanupdateMsg = req.session.newLoanupdateMsg;
		req.session.newLoanupdateMsg = '';
	}

	//req.session.viewType="inprogressContract"
	var responsedata = {
		approveerror: errorval,
		approvesuccess: successval,
		newLoanupdateMsg: newLoanupdateMsg,
		newLoanupdateSuccessMsg: newLoanupdateSuccessMsg
	};
	res.view("admin/pendingach/inprogressContractsachlist", responsedata);
}
function showFundedContracts(req, res) {
	var errorval = '';
	var successval = '';
	var newLoanupdateSuccessMsg = '';
	var newLoanupdateMsg = '';

	if (req.session.approveerror != '') {
		errorval = req.session.approveerror;
		req.session.approveerror = '';
	}
	if (req.session.successmsg != '') {
		successval = req.session.successmsg;
		req.session.successmsg = '';
	}
	if ("undefined" !== typeof req.session.newLoanupdateSuccessMsg && req.session.newLoanupdateSuccessMsg != '' && req.session.newLoanupdateSuccessMsg != null) {
		newLoanupdateSuccessMsg = req.session.newLoanupdateSuccessMsg;
		req.session.newLoanupdateSuccessMsg = '';
	}
	if ("undefined" !== typeof req.session.newLoanupdateMsg && req.session.newLoanupdateMsg != '' && req.session.newLoanupdateMsg != null) {
		newLoanupdateMsg = req.session.newLoanupdateMsg;
		req.session.newLoanupdateMsg = '';
	}
	//req.session.viewType="archiveContract"
	var responsedata = {
		approveerror: errorval,
		approvesuccess: successval,
		newLoanupdateMsg: newLoanupdateMsg,
		newLoanupdateSuccessMsg: newLoanupdateSuccessMsg
	};
	res.view("admin/pendingach/fundedContractsList", responsedata);
}

function showProcedureDateSetAction(req, res) {
	var errorval = '';
	var successval = '';
	if (req.session.approveerror != '') {
		errorval = req.session.approveerror;
		req.session.approveerror = '';
	}
	if (req.session.successmsg != '') {
		successval = req.session.successmsg;
		req.session.successmsg = '';
	}
	//req.session.viewType='procedureDateSet';
	var responsedata = {
		approveerror: errorval,
		approvesuccess: successval
	};
	res.view("admin/pendingach/procedureDateSetachlist", responsedata);
}


function completeApplication(req, res) {
	let viewtype = 'approved';
	let options = {};
	let totalrecords = 0;
	let iDisplayLengthvalue = 0;
	// viewtype chooses which query to run
	if ("undefined" !== req.param("viewtype") && req.param("viewtype") != '' && req.param("viewtype") != null) {
		viewtype = req.param("viewtype");
	}
	const page = parseInt(req.query.currentPage) || 1;
	// defines the query for the database call
	if (viewtype == "approved") {
		options = {
			status: 'OPENED',
			isPaymentActive: true,
			achstatus: { $eq: 1, $exists: true },
			$and: [
				{ $or: [{ firstpaymentcompleted: { $exists: false } }, { firstpaymentcompleted: { $eq: 0, $exists: true } }] },
				{ $or: [{ moveToArchive: { $exists: false } }, { moveToArchive: { $eq: 0, $exists: true } }] }
			]
		};
	} else if (viewtype == "funded") {
		options = { status: 'FUNDED' };
	} else if (viewtype == "pending") {
		options = { status: "PENDING", achstatus: 0 };
	} else if (viewtype == 'denied') {
		options = {
			status: { $in: ['OPENED', 'DENIED'] },
			achstatus: { $eq: 2, $exists: true },
			$and: [{
				$or: [
					{ moveToArchive: { $eq: 0, $exists: true } },
					{
						$and: [
							{ moveToArchive: { $exists: false } },
							{ createdAt: { $gte: moment().startOf('day').subtract(60, "days").toDate(), $exists: true } }
						]
					}
				]
			}]
		};
	} else {
		options = {
			status: 'OPENED',
			isPaymentActive: true,
			achstatus: { $eq: 1, $exists: true },
			$and: [
				{ $or: [{ firstpaymentcompleted: { $exists: false } }, { firstpaymentcompleted: { $eq: 0, $exists: true } }] },
				{ $or: [{ moveToArchive: { $exists: false } }, { moveToArchive: { $eq: 0, $exists: true } }] }
			]
		};
	}
	// admin user is linked to practice only grab users linked to that practice
	if ("undefined" !== typeof req.session.adminpracticeID && req.session.adminpracticeID != "" && req.session.adminpracticeID != null) {
		options.practicemanagement = req.session.adminpracticeID;
	}
	console.log(options);
	sails.log.info("AchController.completeApplication options", options);
	console.log(options);
	const paymentManagementPromise = PaymentManagement.find(options).populate("user").populate("practicemanagement").populate("screentracking");
	paymentManagementPromise
		.exec(function (err, paymentmanagementdata) {
			if (err) {
				res.send(500, { error: "DB error" });
			}
			paymentmanagementdata = Screentracking.getFundingTierFromPaymentManagementList(paymentmanagementdata);
			//Filter user details not available
			paymentmanagementdata = _.filter(paymentmanagementdata, function (item) {
				if (item.user) {
					return true;
				}
			});
			// sorts columns asc
			paymentmanagementdata = sortListBy(paymentmanagementdata, viewtype, req.query.iSortCol_0);

			// sorts columns desc
			if (req.query.sSortDir_0 == "desc") {
				paymentmanagementdata.reverse();
			}
			//Filter using search data
			if (req.query.sSearch) {
				let search = req.query.sSearch.toLowerCase();
				paymentmanagementdata = _.filter(paymentmanagementdata, function (item) {
					if (item.loanReference != null) {
						if (item.loanReference.toLowerCase().indexOf(search) > -1) {
							return true;
						}
					}
					if (item.user.firstname != null) {
						if (item.user.firstname.toLowerCase().indexOf(search) > -1) {
							return true;
						}
					}
					if (item.user.email != null) {
						if (item.user.email.toLowerCase().indexOf(search) > -1) {
							return true;
						}
					}
					if (item.user.phoneNumber != null) {
						if (item.user.phoneNumber.indexOf(search) > -1) {
							return true;
						}
					}
					if (item.loanSetdate != null) {
						if (moment(item.loanSetdate).format("MM-DD-YYY") == search) {
							return true;
						}
					}
					if (item.payOffAmount != null) {
						if (parseInt(item.payOffAmount) == parseInt(search)) {
							return true;
						}
					}
					if (item.createdAt != null) {
						if (moment(item.createdAt).format("MM-DD-YYYY") == search) {
							return true;
						}
					}
					if (item.updatedAt != null) {
						if (moment(item.updatedAt).format("MM-DD-YYYY") == search) {
							return true;
						}
					}
					if (item.apr != null) {
						if (parseInt(item.apr) == parseInt(search)) {
							return true;
						}
					}
					if (item.practicemanagement) {
						if (item.practicemanagement.PracticeName != null) {
							if (item.practicemanagement.PracticeName.indexOf(search) > -1) {
								return true;
							}
						}
					}
					return false;
				});
			}
			//total records count
			totalrecords = paymentmanagementdata.length;

			//Filter by limit records
			let p = parseInt(req.query.iDisplayStart) + 1;
			skiprecord = parseInt(req.query.iDisplayStart);
			checklimitrecords = skiprecord + parseInt(req.query.iDisplayLength);
			iDisplayLengthvalue = totalrecords;
			if (checklimitrecords < totalrecords) {
				iDisplayLengthvalue = parseInt(req.query.iDisplayLength) + parseInt(skiprecord);
			}
			if (viewtype != "pending") {
				paymentmanagementdata = paymentmanagementdata.slice(skiprecord, iDisplayLengthvalue);
			}

			//Final output starts here
			const pendinguser = [];
			paymentmanagementdata.forEach(function (paydata, loopvalue) {
				loopid = loopvalue + skiprecord + 1;
				let appReference = "--";
				let payloanReference = "--";
				let payuserName = "--";
				let payuserEmail = "--";
				let payuserphoneNumber = "--";
				let registeredtype = "--";
				let practicename = "--";
				let procedureDate = "--";
				let payOffAmount = 0;
				let creditScore = "--";
				let createdAt;
				let updatedAt;
				let apr = "--";
				let fundingTier = "";
				let systemUniqueKeyURL = 'getAchUserDetails/' + paydata.id;
				appReference = paydata.screentracking.applicationReference;
				if (paydata.loanReference != "" && paydata.loanReference != null) {
					payloanReference = '<a href=\'' + systemUniqueKeyURL + '\'>' + paydata.loanReference + '</a>';
				}
				if (paydata.user) {
					if (paydata.user.firstname != "" && paydata.user.firstname != null) {
						payuserName = paydata.user.firstname + " " + paydata.user.lastname;
					}
					if (paydata.user.email != "" && paydata.user.email != null) {
						payuserEmail = paydata.user.email;
					}
					if (paydata.user.phoneNumber != "" && paydata.user.phoneNumber != null) {
						payuserphoneNumber = paydata.user.phoneNumber.replace(/[^\d]/g, "");
						payuserphoneNumber = payuserphoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
					}
					if (paydata.user.registeredtype) {
						registeredtype = paydata.user.registeredtype;
					}
				}
				if (paydata.practicemanagement) {
					if (paydata.practicemanagement.PracticeName != "" && paydata.practicemanagement.PracticeName != null) {
						practicename = paydata.practicemanagement.PracticeName;
					}
				}
				if (paydata.fundingTier) {
					fundingTier = paydata.fundingTier;
				}
				if (paydata.loanSetdate) {
					procedureDate = moment(paydata.loanSetdate).format("MM-DD-YYYY");
				}
				if (paydata.payOffAmount) {
					payOffAmount = "$" + paydata.payOffAmount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
				}
				if (paydata.creditScore) {
					creditScore = paydata.creditScore;
				}
				paydata.createdAt = moment(paydata.createdAt).format("MM-DD-YYYY");
				createdAt = paydata.createdAt;
				paydata.updatedAt = moment(paydata.updatedAt).format("MM-DD-YYYY");
				updatedAt = paydata.updatedAt;
				if (paydata.hasOwnProperty("apr")) {
					apr = parseFloat(paydata.apr) + "%";
				}
				// status icon
				if (paydata.achstatus == 0) {
					statusicon = '<i class=\'fa fa-circle text-warning\' aria-hidden=\'true\' ></i>&nbsp;&nbsp;Pending';
				}
				if (paydata.achstatus == 1) {
					statusicon = '<i class=\'fa fa-circle text-success\' aria-hidden=\'true\' ></i>&nbsp;&nbsp;Approved';
				}
				if (paydata.achstatus == 2) {
					if (paydata.deniedfromapp == 1) {
						statusicon = '<i class=\'fa fa-circle text-danger\' aria-hidden=\'true\' ></i>&nbsp;&nbsp;Denied (from app)';
					} else {
						statusicon = '<i class=\'fa fa-circle text-danger\' aria-hidden=\'true\' ></i>&nbsp;&nbsp;Denied';
					}
				}
				pendinguser.push({
					loopid: loopid,
					appReference: appReference,
					loanReference: payloanReference,
					name: payuserName,
					email: payuserEmail,
					phoneNumber: payuserphoneNumber,
					practicename: practicename,
					fundingtier: fundingTier,
					procedureDate: procedureDate,
					payOffAmount: payOffAmount,
					createdAt: createdAt,
					updatedAt: updatedAt,
					apr: apr,
					status: statusicon,
					creditScore: creditScore,
					registeredtype: registeredtype
				});
			});
			const json = {
				sEcho: req.query.sEcho,
				iTotalRecords: totalrecords,
				iTotalDisplayRecords: totalrecords,
				aaData: pendinguser
			};
			res.contentType("application/json");
			res.json(json);
		});
	function sortListBy(paymentmanagementdata, type, col) {
		if (type == "approved" || type == "funded") {
			switch (col) {
				case '1': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'screentracking.applicationReference'); break;
				case '2': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'loanReference'); break;
				case '3': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.firstname'); break;
				case '4': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.email'); break;
				case '5': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.phoneNumber'); break;
				case '6': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'practicemanagement.PracticeName'); break;
				case '7': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'fundingTier'); break;
				case '8': paymentmanagementdata = _.sortBy(paymentmanagementdata, "loanSetdate"); break;
				case '9': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'payOffAmount'); break;
				case '10': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'apr'); break;
				case '11': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'createdAt'); break;
				case '12': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'updatedAt'); break;
				default: break;
			};
		} else if (type == "pending") {
			switch (col) {
				case '1': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'screentracking.appReference'); break;
				case '2': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'loanReference'); break;
				case '3': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.firstname'); break;
				case '4': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.email'); break;
				case '5': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.phoneNumber'); break;
				case '6': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'practicemanagement.PracticeName'); break;
				case '7': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'fundingTier'); break;
				case '8': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'payOffAmount'); break;
				case '9': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'apr'); break;
				case '10': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'creditScore'); break;
				case '11': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'createdAt'); break;
				case '12': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'updatedAt'); break;
				case '13': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.registeredtype'); break;
				default: break;
			};
		} else if (type == "denied") {
			switch (col) {
				case '1': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'screentracking.appReference'); break;
				case '2': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'loanReference'); break;
				case '3': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.firstname'); break;
				case '4': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.email'); break;
				case '5': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.phoneNumber'); break;
				case '6': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'practicemanagement.PracticeName'); break;
				case '7': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'fundingTier'); break;
				case '8': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'createdAt'); break;
				case '9': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'updatedAt'); break;
				case '10': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'status'); break;
				case '11': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.registeredtype'); break;
				default: break;
			};
		} else {
			switch (col) {
				case '1': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'screentracking.appReference'); break;
				case '2': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'loanReference'); break;
				case '3': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.firstname'); break;
				case '4': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.email'); break;
				case '5': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.phoneNumber'); break;
				default: break;
			};
		}
		return paymentmanagementdata;
	}
}

function addchargeoffAction(req, res) {

	var payID = req.param('id');
	var rowID = req.param('rowid');

	if (payID) {
		var options = {
			id: payID
		};



		PaymentManagement.findOne(options)
			.then(function (paymentmanagementdata) {

				chargeoffAmount = 0;
				var statusPaidLength = 0;
				//var scheduleData = _.filter(initialschedulelist, {  'uniqueScheduleId': uniqueScheduleId });
				_.forEach(paymentmanagementdata.paymentSchedule, function (schedule, key) {
					if (rowID == key) {

						var userid = paymentmanagementdata.user;
						var amount = schedule.amount;
						schedule.status = 'PAID OFF';
						schedule.chargeoff = 1;
						schedule.amount = 0;
						/*var uniqueScheduleId = schedule.uniqueScheduleId;
						var intialschedule = schedule;
						VikingRequest
						.createchrageoffSchedule(userid,paymentmanagementdata,amount,uniqueScheduleId,intialschedule)
						.then(function(chargeoffres){
								 sails.log.info("chargeoffres",chargeoffres);
								if(chargeoffres.code==200)
								{
								chargeoffAmount =amount;
								paymentmanagementdata.logs.push({
									 message: 'Charge off for '+amount,
									 date: new Date()
								 });
								}
						});*/
					}

					if (schedule.status == 'PAID OFF') {
						statusPaidLength = statusPaidLength + 1
					}
				})
				if (statusPaidLength === paymentmanagementdata.paymentSchedule.length) {
					paymentmanagementdata.status = 'PAID OFF';
				}
				paymentmanagementdata.paymentSchedule = _.orderBy(paymentmanagementdata.paymentSchedule, ['status'], ['asc']);
				paymentmanagementdata.save(function (err) {

					if (err) {
						req.session.chargeerror = '';
						req.session.chargeerror = 'Unable to update charge off. Try again!';
						return res.redirect("/admin/viewDefaultUser/" + payID);
					}
					else {
						//Log Activity
						var modulename = 'Charge off update';
						var modulemessage = 'Charge off updated successfully for $ ' + chargeoffAmount;
						req.achlog = 1;
						req.payID = payID;
						req.logdata = paymentmanagementdata;
						Logactivity.registerLogActivity(req, modulename, modulemessage);

						var allParams = {
							subject: modulename,
							comments: modulemessage
						}

						Achcomments
							.createAchComments(allParams, payID)
							.then(function (achcomments) {

								req.session.chargesuccess = '';
								req.session.chargesuccess = 'Charge off updated successfully';
								return res.redirect("/admin/viewDefaultUser/" + payID);

							}).catch(function (err) {

								req.session.chargesuccess = '';
								req.session.chargesuccess = 'Unable to update charge off. Try again!';
								return res.redirect("/admin/viewDefaultUser/" + payID);

							});
					}
				});
			})
			.catch(function (err) {
				req.session.chargeerror = '';
				req.session.chargeerror = 'Unable to update charge off. Try again!';
				return res.redirect("/admin/viewDefaultUser/" + payID);
			});
	}
	else {
		req.session.chargeerror = '';
		req.session.chargeerror = 'Unable to update charge off. Try again!';
		return res.redirect("/admin/viewDefaultUser/" + payID);
	}

}

function showAllBlockedAction(req, res) {

	var errorval = '';
	var successval = '';
	if (req.session.releaseerror != '') {
		errorval = req.session.releaseerror;
		req.session.releaseerror = '';
	}

	if (req.session.releasesuccess != '') {
		successval = req.session.releasesuccess;
		req.session.releasesuccess = '';
	}

	var responsedata = {
		releaseerror: errorval,
		releasesuccess: successval
	};

	res.view("admin/pendingach/blockedachList", responsedata);
}

function ajaxBlockedAchAction_old(req, res) {

	var options = {
		status: 'OPENED',
		isPaymentActive: true,
		achstatus: { $eq: 3, $exists: true },
	};

	PaymentManagement.find(options)
		.populate('user')
		.exec(function (err, paymentmanagementdata) {
			if (err) {
				res.send(500, { error: 'DB error' });
			} else {

				if (req.query.sSortDir_0 == 'desc') {

					switch (req.query.iSortCol_0) {
						case '0': paymentmanagementdata = _.sortBy(paymentmanagementdata, '_id').reverse(); break;
						case '1': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'loanReference').reverse(); break;
						case '2': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.name').reverse(); break;
						case '3': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.screenName').reverse(); break;
						case '4': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.email').reverse(); break;
						case '5': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.phoneNumber').reverse(); break;
						case '6': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'payOffAmount').reverse(); break;
						case '7': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'maturityDate').reverse(); break;
						case '8': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'createdAt').reverse(); break;
						default: break;
					};

				}
				else {
					switch (req.query.iSortCol_0) {
						case '0': paymentmanagementdata = _.sortBy(paymentmanagementdata, '_id'); break;
						case '1': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'loanReference'); break;
						case '2': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.name'); break;
						case '3': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.screenName'); break;
						case '4': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.email'); break;
						case '5': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.phoneNumber'); break;
						case '6': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'payOffAmount'); break;
						case '7': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'maturityDate'); break;
						case '8': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'createdAt'); break;
						default: break;
					};
				}

				//Filter user details not available
				paymentmanagementdata = _.filter(paymentmanagementdata, function (item) {
					if (item.user) {
						return true;
					}
				});

				//Filter using search data
				if (req.query.sSearch) {
					var search = req.query.sSearch.toLowerCase();

					paymentmanagementdata = _.filter(paymentmanagementdata, function (item) {
						if (item.loanReference != null) {
							if (item.loanReference.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}

						if (item.user.name != null) {
							if (item.user.name.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}

						if (item.user.screenName != null) {
							if (item.user.screenName.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}
						if (item.user.email != null) {
							if (item.user.email.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}
						if (item.user.phoneNumber != null) {
							if (item.user.phoneNumber.indexOf(search) > -1) {
								return true;
							}
						}

						if (item.payOffAmount != null) {
							if (parseInt(item.payOffAmount) == parseInt(search)) {
								return true;
							}
						}

						if (item.maturityDate != null) {
							if (moment(item.maturityDate).format('MM-DD-YYYY') == search) {
								return true;
							}
						}


						if (item.createdAt != null) {
							if (moment(item.createdAt).format('MM-DD-YYYY') == search) {
								return true;
							}
						}


						return false;
					});
				}

				//total records count
				totalrecords = paymentmanagementdata.length;

				//Filter by limit records
				var p = parseInt(req.query.iDisplayStart) + 1;
				skiprecord = parseInt(req.query.iDisplayStart);
				checklimitrecords = skiprecord + parseInt(req.query.iDisplayLength);
				if (checklimitrecords > totalrecords) {
					iDisplayLengthvalue = totalrecords;
				}
				else {
					//iDisplayLengthvalue=req.query.iDisplayLength;
					iDisplayLengthvalue = parseInt(req.query.iDisplayLength) + parseInt(skiprecord);
				}
				paymentmanagementdata = paymentmanagementdata.slice(skiprecord, iDisplayLengthvalue);


				//Final output starts here
				var pendinguser = [];
				paymentmanagementdata.forEach(function (paydata, loopvalue) {

					loopid = loopvalue + skiprecord + 1;

					var payuserName = '';
					var payuserscreenName = '';
					var payuserEmail = '';
					var payuserphoneNumber = '';
					if (paydata.user) {
						if (paydata.user.name != '' && paydata.user.name != null) {
							var payuserName = paydata.user.name;
						}
						if (paydata.user.screenName != '' && paydata.user.screenName != null) {
							var payuserscreenName = paydata.user.screenName;
						}
						if (paydata.user.email != '' && paydata.user.email != null) {
							var payuserEmail = paydata.user.email;
						}
						if (paydata.user.phoneNumber != '' && paydata.user.phoneNumber != null) {
							var payuserphoneNumber = paydata.user.phoneNumber;
						}
					}

					systemUniqueKeyURL = 'getAchUserDetails/' + paydata.id;

					if (paydata.loanReference != '' && paydata.loanReference != null) {
						var payloanReference = '<a href=\'' + systemUniqueKeyURL + '\'>' + paydata.loanReference + '</a>';
					} else {
						var payloanReference = '--';
					}
					paydata.maturityDate = moment(paydata.maturityDate).format('MM-DD-YYYY');
					paydata.createdAt = moment(paydata.createdAt).tz("America/los_angeles").format('MM-DD-YYYY hh:mm:ss');

					//systemUniqueKeyURL = 'getAchUserDetails/'+paydata.user.systemUniqueKey;
					//systemUniqueKeyURL = 'getAchUserDetails/'+paydata.user.id;


					var payuserNameLink = '<a href=\'' + systemUniqueKeyURL + '\'>' + payuserName + '</a>';

					var statusicon = '<a href="/admin/getAchUserDetails/' + paydata.id + '"><i class="fa fa-eye" aria-hidden="true" style="cursor:pointer;color:#337ab7;"></i></a>';

					if (payuserEmail) {
						var emillnk = '<a href="mailto:' + payuserEmail + '">' + payuserEmail + '</a>';
					}

					pendinguser.push({ loopid: loopid, loanReference: payloanReference, name: payuserNameLink, screenName: payuserscreenName, email: payuserEmail, phoneNumber: payuserphoneNumber, payOffAmount: paydata.payOffAmount, maturityDate: paydata.maturityDate, createdAt: paydata.createdAt, status: statusicon });
				});

				var json = {
					sEcho: req.query.sEcho,
					iTotalRecords: totalrecords,
					iTotalDisplayRecords: totalrecords,
					aaData: pendinguser
				};
				res.contentType('application/json');
				res.json(json);
			}
		});

}

function ajaxBlockedAchAction(req, res) {

	//Sorting
	var colS = "";

	if (req.query.sSortDir_0 == 'desc') {
		sorttype = -1;
	}
	else {
		sorttype = 1;
	}
	if (req.query.sSearch) {
		var criteria = {
			iscompleted: [0, 2],
		};

	}
	else {
		var criteria = {
			iscompleted: [0, 2]
		};
	}

	if ("undefined" !== typeof req.session.adminpracticeID && req.session.adminpracticeID != '' && req.session.adminpracticeID != null) {
		var options = {
			blockedList: true,
			practicemanagement: req.session.adminpracticeID
		};
	}
	else {
		var options = {
			blockedList: true
		};
	}


	Screentracking
		.find(options)
		.populate('user')
		.then(function (screentracking) {

			if (req.query.sSortDir_0 == 'desc') {
				switch (req.query.iSortCol_0) {
					case '0': screentracking = _.sortBy(screentracking, '_id').reverse(); break;
					case '1': screentracking = _.sortBy(screentracking, 'applicationReference').reverse(); break;
					case '2': screentracking = _.sortBy(screentracking, 'user.firstname').reverse(); break;
					//case '3': screentracking = _.sortBy(screentracking, 'user.directMail').reverse(); break;
					//case '4': screentracking = _.sortBy(screentracking, 'user.badList').reverse(); break;
					case '3': screentracking = _.sortBy(screentracking, 'user.email').reverse(); break;
					case '4': screentracking = _.sortBy(screentracking, 'user.phoneNumber').reverse(); break;
					case '5': screentracking = _.sortBy(screentracking, 'practicemanagement.PracticeName').reverse(); break;
					case '6': screentracking = _.sortBy(screentracking, 'user.registeredtype').reverse(); break;
					case '7': screentracking = _.sortBy(screentracking, 'createdAt').reverse(); break;
					case '11': screentracking = _.sortBy(screentracking, 'lastScreenName').reverse(); break;
					case '12': screentracking = _.sortBy(screentracking, 'user.underwriter').reverse(); break;
					//case '11': screentracking = _.sortBy(screentracking, 'user.lastname').reverse(); break;
					default: break;
				};
			}
			else {
				switch (req.query.iSortCol_0) {
					case '0': screentracking = _.sortBy(screentracking, '_id'); break;
					case '1': screentracking = _.sortBy(screentracking, 'applicationReference'); break;
					case '2': screentracking = _.sortBy(screentracking, 'user.firstname'); break;
					//case '3': screentracking = _.sortBy(screentracking, 'user.directMail').reverse(); break;
					//case '4': screentracking = _.sortBy(screentracking, 'user.badList').reverse(); break;
					case '3': screentracking = _.sortBy(screentracking, 'user.email').reverse(); break;
					case '4': screentracking = _.sortBy(screentracking, 'user.phoneNumber').reverse(); break;
					case '5': screentracking = _.sortBy(screentracking, 'practicemanagement.PracticeName').reverse(); break;
					case '6': screentracking = _.sortBy(screentracking, 'user.registeredtype').reverse(); break;
					case '7': screentracking = _.sortBy(screentracking, 'createdAt').reverse(); break;
					case '11': screentracking = _.sortBy(screentracking, 'lastScreenName').reverse(); break;
					case '12': screentracking = _.sortBy(screentracking, 'user.underwriter').reverse(); break;
					//case '11': screentracking = _.sortBy(screentracking, 'user.lastname').reverse(); break;
					default: break;
				};
			}

			//Filter user details not available
			screentracking = _.filter(screentracking, function (item) {
				if (item.user) {
					return true;
				}
			});

			screentracking = _.filter(screentracking, function (item) {
				if (item.user.email != '' && item.user.email != null) {
					return true;
				}
			});

			//Filter using search data
			if (req.query.sSearch) {
				var search = req.query.sSearch.toLowerCase();
				screentracking = _.filter(screentracking, function (item) {
					if (item.applicationReference != null) {
						if (item.applicationReference.toLowerCase().indexOf(search) > -1) {
							return true;
						}
					}

					if (item.user.firstname != null) {
						if (item.user.firstname.toLowerCase().indexOf(search) > -1) {
							return true;
						}
					}

					if (item.user.lastname != null) {
						if (item.user.lastname.toLowerCase().indexOf(search) > -1) {
							return true;
						}
					}

					if (item.user.underwriter != null) {
						if (item.user.underwriter.toLowerCase().indexOf(search) > -1) {
							return true;
						}
					}

					/*if(item.user.screenName!=null)
					{
						if(item.user.screenName.toLowerCase().indexOf(search)>-1 )
						{
							return true;
						}
					}*/

					if (item.user.email != null) {
						if (item.user.email.toLowerCase().indexOf(search) > -1) {
							return true;
						}
					}

					if (item.user.phoneNumber != null) {
						if (item.user.phoneNumber.indexOf(search) > -1) {
							return true;
						}
					}

					if (item.lastScreenName != null) {
						if (item.lastScreenName.toLowerCase().indexOf(search) > -1) {
							return true;
						}
					}

					if (item.createdAt != null) {
						if (moment(item.createdAt).format('MM-DD-YYYY') == search) {
							return true;
						}
					}

					if (item.practicemanagement) {
						if (item.practicemanagement.PracticeName != null) {
							if (item.practicemanagement.PracticeName.indexOf(search) > -1) {
								return true;
							}
						}
					}
					return false;

				});
			}


			totalrecords = screentracking.length;


			//Filter by limit records
			skiprecord = parseInt(req.query.iDisplayStart);
			checklimitrecords = skiprecord + parseInt(req.query.iDisplayLength);
			if (checklimitrecords > totalrecords) {
				iDisplayLengthvalue = parseInt(totalrecords);
			}
			else {
				iDisplayLengthvalue = parseInt(req.query.iDisplayLength) + parseInt(skiprecord);
			}



			screentracking = screentracking.slice(skiprecord, iDisplayLengthvalue);

			var screentrackingDetails = [];

			screentracking.forEach(function (screentrackingdata, loopvalue) {
				loopid = loopvalue + skiprecord + 1;
				screentrackingdata.createdAt = moment(screentrackingdata.createdAt).tz("america/los_angeles").format('MM-DD-YYYY hh:mm:ss');
				if ("undefined" === typeof screentrackingdata.applicationReference || screentrackingdata.applicationReference == '' || screentrackingdata.applicationReference == null) {
					screentrackingdata.applicationReference = '--';
				}
				if ("undefined" === typeof screentrackingdata.user.firstname || screentrackingdata.user.firstname == '' || screentrackingdata.user.firstname == null) {
					screentrackingdata.user.firstname = '--';
				}
				else {

					var fullname = screentrackingdata.user.firstname + ' ' + screentrackingdata.user.lastname;
				}


				/*if ("undefined" === typeof screentrackingdata.lastScreenName || screentrackingdata.lastScreenName=='' || screentrackingdata.lastScreenName==null)
				{
					screentrackingdata.user.screenName= '--';
				}*/

				if ("undefined" === typeof screentrackingdata.user.email || screentrackingdata.user.email == '' || screentrackingdata.user.email == null) {
					screentrackingdata.user.email = '--';
				}

				if ("undefined" === typeof screentrackingdata.user.phoneNumber || screentrackingdata.user.phoneNumber == '' || screentrackingdata.user.phoneNumber == null) {
					screentrackingdata.user.phoneNumber = '--';
				}
				if (screentrackingdata.user.email) {
					var emillnk = '<a href="mailto:' + screentrackingdata.user.email + '">' + screentrackingdata.user.email + '</a>';
				}
				if (screentrackingdata.applicationReference) {
					var appReference = ' <a href="/admin/viewBlocked/' + screentrackingdata.id + '">' + screentrackingdata.applicationReference + '</a>';
				}


				if ("undefined" === typeof screentrackingdata.user.underwriter || screentrackingdata.user.underwriter == '' || screentrackingdata.user.underwriter == null) {
					screentrackingdata.user.underwriter = '--';
				}

				/*&nbsp;&nbsp; <a href="/admin/deleteScreenDetails/'+screentrackingdata.id+'" onclick="return confirm(\'Are you sure?\')"><i class="fa fa-trash" aria-hidden="true" style="cursor:pointer;color:#FF0000;"></i></a> */


				if (screentrackingdata.user.registeredtype != 'signup') {
					statusicon = ' <a href="/admin/loanofferinfo/' + screentrackingdata.id + '"><i class="fa fa-money" aria-hidden="true" style="cursor:pointer;color:#337ab7;"></i></a> &nbsp;&nbsp;<input type="checkbox" id="screenlist" name="screenlist[]" value="' + screentrackingdata.id + '">';
				} else {
					statusicon = '<input type="checkbox" id="screenlist" name="screenlist[]" value="' + screentrackingdata.id + '">';
				}



				if (screentrackingdata.user.isBankAdded == true) {
					var plaidLink = 'Yes';
				}
				else {
					var plaidLink = 'No';
				}



				if (screentrackingdata.user.directMail == 1) {
					var directMailUser = 'Yes';
				}
				else if (screentrackingdata.user.directMail == 2) {
					var directMailUser = 'No';
				}
				else {
					var directMailUser = '--';
				}

				//badList
				if (screentrackingdata.user.badList == 1) {
					var badListUser = 'Yes';
				}
				else if (screentrackingdata.user.badList == 2) {
					var badListUser = 'No';
				}
				else {
					var badListUser = '--';
				}



				if (screentrackingdata.iscompleted == 2) {
					var promissoryNoteSign = 'Yes';
				}
				else {
					var promissoryNoteSign = 'No';
				}


				var isEmailVerified = screentrackingdata.user.isEmailVerified;
				var isBankAdded = screentrackingdata.user.isBankAdded;
				var isGovernmentIssued = screentrackingdata.user.isGovernmentIssued;
				var isPayroll = screentrackingdata.user.isPayroll;
				var totdocount = 0;
				if (!isEmailVerified) {
					totdocount++;
				}

				if (!isBankAdded) {

					totdocount++;
				}

				if (!isGovernmentIssued) {
					totdocount++;
				}

				if (!isPayroll) {
					totdocount++;
				}

				var practicename = '--';
				if (paydata.practicemanagement) {
					if (paydata.practicemanagement.PracticeName != '' && paydata.practicemanagement.PracticeName != null) {
						var practicename = paydata.practicemanagement.PracticeName;
					}
				}

				screentrackingDetails.push({
					loopid: loopid,
					applicationReference: appReference,
					name: fullname,
					//directMail: directMailUser,
					//badList: badListUser,
					email: screentrackingdata.user.email,
					phoneNumber: screentrackingdata.user.phoneNumber,
					practicename: practicename,
					registeredtype: screentrackingdata.user.registeredtype,
					createdAt: screentrackingdata.createdAt,
					promissoryNoteSign: promissoryNoteSign,
					plaidLink: plaidLink,
					toDoList: totdocount,
					lastScreenName: screentrackingdata.lastScreenName,
					underwriter: screentrackingdata.user.underwriter,
					status: statusicon
				});

			});

			//console.log("screentrackingDetails----",screentrackingDetails)

			var json = {
				sEcho: req.query.sEcho,
				iTotalRecords: totalrecords,
				iTotalDisplayRecords: totalrecords,
				aaData: screentrackingDetails
			};

			res.contentType('application/json');
			res.json(json);
		});

}

function releaseAppAction(req, res) {

	var payID = req.param('paymentID');
	var allParams = req.allParams();
	if (payID) {
		var options = {
			id: payID
		};

		PaymentManagement.findOne(options)
			.then(function (paymentmanagementdata) {

				paymentmanagementdata.achstatus = 0;
				paymentmanagementdata.save(function (err) {
					if (err) {
						req.session.releaseerror = '';
						req.session.releaseerror = 'Unable to Release the Application. Try again!';
						return res.redirect("/admin/showAllBlocked");
					}
					else {
						//Log Activity
						var modulename = 'Release Blocked Application';
						var modulemessage = 'Released successfully';
						req.achlog = 1;
						req.payID = payID;
						req.logdata = paymentmanagementdata;
						Logactivity.registerLogActivity(req, modulename, modulemessage);


						Achcomments
							.createAchComments(allParams, payID)
							.then(function (achcomments) {

								req.session.releasesuccess = '';
								req.session.releasesuccess = 'Application Released successfully';
								return res.redirect("/admin/showAllBlocked");

							}).catch(function (err) {
								req.session.releaseerror = '';
								req.session.releaseerror = 'Unable to Release the Application. Try again!';
								return res.redirect("/admin/showAllBlocked/");
							});



					}
				});

			})
			.catch(function (err) {
				req.session.releaseerror = '';
				req.session.releaseerror = 'Unable to Release the Application. Try again!';
				return res.redirect("/admin/showAllBlocked/");
			});
	}
	else {
		req.session.releaseerror = '';
		req.session.releaseerror = 'Unable to Release the Application. Try again!';
		return res.redirect("/admin/showAllBlocked/");
	}

}

/* Approve loan from admin panel and process ACH starts here*/
function approveUserLoanAction(req, res) {

	var payID = req.param('paymentID');
	var allParams = req.allParams();
	if (payID) {
		/*var initialData ='checkUserTransferStatus cron called \n';
		fs.appendFile('checktransferlog.txt', initialData , function (err) {

				if (err) txthrow err;
		});*/

		var options = { id: payID, achstatus: 0 };
		PaymentManagement.findOne(options)
			.populate('user')
			.populate('account')
			.then(function (paymentmanagementdata) {

				var accountid = paymentmanagementdata.account.id;
				var acccriteria = { accounts: accountid };

				Screentracking
					.findOne(acccriteria)
					.sort("createdAt DESC")
					.then(function (userscreenres) {
						var plaiduserid = userscreenres.plaiduser;
						var plaidcriteria = { id: plaiduserid };


						PlaidUser
							.find(plaidcriteria)
							.then(function (plaidUsers) {


								//var customerToken = paymentmanagementdata.user.customertoken;
								//var customerToken = paymentmanagementdata.account.customertoken;
								//var paymentToken = paymentmanagementdata.account.paymenttoken;
								/*var statename = plaidUsers[0].addresses[0].data.state;
								var username = plaidUsers[0].names[0];
								var cityname =plaidUsers[0].addresses[0].data.city;
								var zipcode = plaidUsers[0].addresses[0].data.zip;
								var streetname = plaidUsers[0].addresses[0].data.street;
								//Fetch user first name and last name
								if(username!='')
								{
									var mystring  = username.split(" ");
									var size = mystring.length;
									if(size==1){
										var FirstName = mystring[0];
										var LastName = mystring[0];
									}else if(size == 2){
		
										var FirstName = mystring[0];
										var LastName = mystring[1];
									}
									else if(size == 3){
										var FirstName = mystring[0];
										var LastName = mystring[1]+" "+mystring[2];
									}
		
		
									//Fetch state details
									if(statename){
										var statecode	= statename;
									}else{
										var statecode	='CA';
									}*/

								//process.exit(1);
								AchService.createViking(paymentmanagementdata, req, res)
									.then(function (result) {

										//return 1;

										ApplicationService
											.reGeneratepromissorypdf(paymentmanagementdata.id, paymentmanagementdata.user.id, req, res)
											.then(function (generatedResponse) {
												/*req.session.successmsg='';
												req.session.successmsg = 'Loan has been approved successfully';
												return res.redirect("admin/getAchDetails");*/

												//sails.log(generatedResponse);

												//process.exit(1);
												//return 1;

												//if(result)
												if (result.code == 200) {

													/*var nextPaymentSchedule ='';
													var maturityDate ='';
													counter = 1;
													var lastdayscounter = 0;
													var addDaysvalue =14;
													var lastaddDaysvalue =14;
			
													_.forEach(paymentmanagementdata.paymentSchedule, function(schedule) {
														addDaysvalue = parseInt(counter)*14;
														 var startdate = moment().startOf('day').add(addDaysvalue, 'days').toDate();
														 var formatedate = moment().startOf('day').add(addDaysvalue, 'days').format('ddd, MMM Do YYYY');
			
														 if(parseInt(lastdayscounter)>0)
														 {
															lastaddDaysvalue = parseInt(lastdayscounter)*14;
															var lastpaiddate = moment().startOf('day').add(lastaddDaysvalue, 'days').toDate();
														 }
														 else
														 {
																var lastpaiddate = moment().startOf('day').toDate();
														 }
														 schedule.date = startdate;
														 schedule.formatedate = formatedate;
														 schedule.lastpaiddate = lastpaiddate;
			
														 if(counter==1)
														 {
															nextPaymentSchedule = startdate;
														 }
														 maturityDate = startdate;
														 counter++;
														 lastdayscounter++;
													});*/

													/*paymentmanagementdata.achstatus =1;
													paymentmanagementdata.transferstatus =1;
													paymentmanagementdata.nextPaymentSchedule = nextPaymentSchedule;
													paymentmanagementdata.maturityDate = maturityDate;
													paymentmanagementdata.loanPaymentType = "Viking";
													paymentmanagementdata.transactionStatus = "Sent";
													paymentmanagementdata.transfertransactionid = result.uniqueReferenceID;
													paymentmanagementdata.approvedunderwriter  = req.user.name;*/

													//paymentmanagementdata.transfertransactionid = achresponseData.achID;
													//paymentmanagementdata.achId = achresponseData.achID;

													//paymentmanagementdata.save();

													//Comments Section Start
													/*var modulename    = 'Loan Approved';
													var modulemessage = 'Loan has been approved successfully';
													 var allParams={
														 subject : modulename,
														 comments : modulemessage
														}
													var adminemail = req.user.email;
													Achcomments
													 .createAchComments(allParams,payID,adminemail)
													 .then(function (achcomments) {
													 }).catch(function (err) {
													 });*/
													//Comments Section end




													User.callFundedEmail(paymentmanagementdata.id)
														.then(function (userObjectData) {

															/*var modulename = 'Add pending applications Comment';
															var modulemessage = 'Pending applications comment added successfully';
															req.achlog = 1;
															req.logdata=req.form;
															req.payID= payID;
															Logactivity.registerLogActivity(req,modulename,modulemessage);*/

															var modulename = 'Loan Funded';
															var modulemessage = 'Pending applications move funded successfully';
															req.achlog = 1;
															req.payID = payID;
															Logactivity.registerLogActivity(req, modulename, modulemessage);


														})
														.catch(function (err) {
															sails.log.error('#AchController:approveUserLoanAction:callFundedEmail :: err :', err);
															return res.handleError(err);
														});

													req.session.successmsg = '';
													req.session.successmsg = 'Loan has been approved successfully';
													return res.redirect("admin/getAchDetails");
												}
												else {
													req.session.approveerror = '';
													req.session.approveerror = 'Unable to approve the loan. Try again!';
													return res.redirect("admin/getAchDetails");
												}

											}).catch(function (err) {
												sails.log.error('AchService#originateTransactionForStory :: Error in Authorizarion :: ', err);
												return reject({
													code: 500,
													message: 'INTERNAL_SERVER_ERROR'
												});
											});
									})
									.catch(function (err) {
										req.session.approveerror = '';
										req.session.approveerror = 'Unable to approve the loan. Try again!';
										return res.redirect("admin/getAchDetails");
									});
								/*}
								else
								{
									req.session.approveerror='';
									req.session.approveerror = 'Invalid user details. Try again!';
									return res.redirect("admin/getAchDetails");
								}*/


							})
							.catch(function (err) {
								req.session.approveerror = '';
								req.session.approveerror = 'Unable to Approve the loan. Try again!';
								return res.redirect("admin/getAchDetails");
							});
					})
					.catch(function (err) {
						req.session.approveerror = '';
						req.session.approveerror = 'Unable to Approve the loan. Try again!';
						return res.redirect("admin/getAchDetails");
					});
			}).catch(function (err) {
				req.session.approveerror = '';
				req.session.approveerror = 'Unable to Approve the loan. Try again!';
				return res.redirect("admin/getAchDetails");
			});
	}
	else {
		req.session.approveerror = '';
		req.session.approveerror = 'Unable to Approve the loan. Try again!';
		return res.redirect("admin/getAchDetails");
	}
}


async function sendAddBankInvite(req, res) {
	const id = req.param('id');
	let payID;
	let screenID;
	let redirect = "/admin/dashboard";
	try {
		if (!id) {
			throw new Error("Contract id required");
		}
		let userData;
		if (id.startsWith("p")) {
			payID = id.slice(1);
			redirect = "/admin/getAchUserDetails/" + payID;
			const payData = await PaymentManagement.findOne({ id: payID }).populate("user");
			if (!payData || !payData.user) {
				throw new Error("Contract not found");
			}
			userData = payData.user;
		} else {
			screenID = id.slice(1);
			redirect = "/admin/viewIncomplete/" + screenID;
			const screenData = await Screentracking.findOne({ id: screenID }).populate("user");
			if (!screenData || !screenData.user) {
				throw new Error("Application not found");
			}
			userData = screenData.user;
		}

		await EmailService.sendAddBankInvitation(userData);
		var userreq = {
			userid: userData.id,
			logdata: userData.email + ` - Admin: Sent 'Add Another Bank' request.`
		};
		Useractivity.createUserActivity(userreq, 'Add Another Bank', 'Add Another Bank email');

		req.session.successmsg = '';
		req.session.successmsg = 'Add bank invitation email has been sent successfully.';
		req.session.banksuccessmsg = '';
		req.session.banksuccessmsg = 'success';
		return res.redirect(redirect);
	} catch (err) {
		req.session.bankerror = '';
		req.session.bankerror = 'Unable to send change bank link. Try again!';
		return res.redirect(redirect);
	}
}

function manageReconciliationAction(req, res) {
	var responsedata = {};
	res.view("admin/reconciliation/managereconciliationList", responsedata);
}

function ajaxReconciliationList(req, res) {
	var options = {
		methodtype: [3, 4, 5],
		//achType:[ "creditscore", "creditscorerenewal", "loan" ]
		achType: 'loan'
		//achType: { $eq: 'loan', $exists: true }
		//$or : [ { achType: { $eq: 'loan', $exists: true } }, { achType:{ $exists: false }}  ] ,
		//achType:'loan'
		//appfailure: 1,
		//apiresponsestatus:3
	};

	Achhistory.find(options)
		.populate('user')
		.populate('paymentManagement')
		.exec(function (err, achhistoryData) {
			if (err) {
				res.send(500, { error: 'DB error' });
			}
			else {
				if (req.query.sSortDir_0 == 'desc') {

					switch (req.query.iSortCol_0) {
						case '0': achhistoryData = _.sortBy(achhistoryData, '_id').reverse(); break;
						case '1': achhistoryData = _.sortBy(achhistoryData, 'loanID').reverse(); break;
						case '2': achhistoryData = _.sortBy(achhistoryData, 'user.name').reverse(); break;
						case '3': achhistoryData = _.sortBy(achhistoryData, 'user.screenName').reverse(); break;
						case '4': achhistoryData = _.sortBy(achhistoryData, 'user.email').reverse(); break;
						case '5': achhistoryData = _.sortBy(achhistoryData, 'user.phoneNumber').reverse(); break;
						case '6': achhistoryData = _.sortBy(achhistoryData, 'achAmount').reverse(); break;
						case '7': achhistoryData = _.sortBy(achhistoryData, 'methodtype').reverse(); break;
						case '8': achhistoryData = _.sortBy(achhistoryData, 'apiresponsestatus').reverse(); break;
						case '9': achhistoryData = _.sortBy(achhistoryData, 'status').reverse(); break;
						case '10': achhistoryData = _.sortBy(achhistoryData, 'appfailure').reverse(); break;
						case '11': achhistoryData = _.sortBy(achhistoryData, 'appfailuremessage').reverse(); break;
						case '12': achhistoryData = _.sortBy(achhistoryData, 'createdAt').reverse(); break;
						default: break;
					};

				}
				else {
					switch (req.query.iSortCol_0) {
						case '0': achhistoryData = _.sortBy(achhistoryData, '_id'); break;
						case '1': achhistoryData = _.sortBy(achhistoryData, 'loanID'); break;
						case '2': achhistoryData = _.sortBy(achhistoryData, 'user.name'); break;
						case '3': achhistoryData = _.sortBy(achhistoryData, 'user.screenName'); break;
						case '4': achhistoryData = _.sortBy(achhistoryData, 'user.email'); break;
						case '5': achhistoryData = _.sortBy(achhistoryData, 'user.phoneNumber'); break;
						case '6': achhistoryData = _.sortBy(achhistoryData, 'achAmount'); break;
						case '7': achhistoryData = _.sortBy(achhistoryData, 'methodtype'); break;
						case '8': achhistoryData = _.sortBy(achhistoryData, 'apiresponsestatus'); break;
						case '9': achhistoryData = _.sortBy(achhistoryData, 'status'); break;
						case '10': achhistoryData = _.sortBy(achhistoryData, 'appfailure'); break;
						case '11': achhistoryData = _.sortBy(achhistoryData, 'appfailuremessage'); break;
						case '12': achhistoryData = _.sortBy(achhistoryData, 'createdAt'); break;
						default: break;
					};
				}

				achhistoryData = _.filter(achhistoryData, function (item) {
					if (item.user) {
						return true;
					}
				});

				if (req.query.sSearch) {
					var search = req.query.sSearch.toLowerCase();

					achhistoryData = _.filter(achhistoryData, function (item) {
						if (item.loanID != null) {
							if (item.loanID.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}

						if (item.user.name != null) {
							if (item.user.name.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}

						if (item.user.screenName != null) {
							if (item.user.screenName.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}
						if (item.user.email != null) {
							if (item.user.email.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}
						if (item.user.phoneNumber != null) {
							if (item.user.phoneNumber.indexOf(search) > -1) {
								return true;
							}
						}
						if (item.achAmount != null) {
							if (parseInt(item.achAmount) == parseInt(search)) {
								return true;
							}
						}
						if (item.methodtype != null) {
							var searchdata = '';
							if (search.toLowerCase() == 'achdebit') {
								var searchdata = 4;
							}
							else if (search.toLowerCase() == 'achcredit') {
								var searchdata = 3;
							}
							else {
								var searchdata = search;
							}

							if (parseInt(item.methodtype) == parseInt(searchdata)) {
								return true;
							}
						}
						if (item.apiresponsestatus != null) {
							var searchapistatus = '';
							if (search.toLowerCase() == 'processed') {
								var searchapistatus = 1;
							}
							else if (search.toLowerCase() == 'failed') {
								var searchapistatus = 0;
							}
							else if (search.toLowerCase() == 'processing') {
								var searchapistatus = 3;
							}
							else {
								var searchapistatus = search;
							}

							if (parseInt(item.apiresponsestatus) == parseInt(searchapistatus)) {
								return true;
							}
						}
						if (item.appfailure != null) {
							var searchappfailure = '';
							if (search.toLowerCase() == 'success') {
								var searchappfailure = 0;
							}
							else if (search.toLowerCase() == 'failure') {
								var searchappfailure = 1;
							}
							else {
								var searchappfailure = search;
							}

							if (parseInt(item.appfailure) == parseInt(searchappfailure)) {
								return true;
							}
						}
						if (item.appfailuremessage != null) {
							if (item.appfailuremessage.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}
						if (item.createdAt != null) {
							if (moment(item.createdAt).format('MM-DD-YYYY') == search) {
								return true;
							}
						}
						return false;
					});
				}

				totalrecords = achhistoryData.length;

				var p = parseInt(req.query.iDisplayStart) + 1;
				skiprecord = parseInt(req.query.iDisplayStart);
				checklimitrecords = skiprecord + parseInt(req.query.iDisplayLength);
				if (checklimitrecords > totalrecords) {
					iDisplayLengthvalue = totalrecords;
				}
				else {
					//iDisplayLengthvalue=req.query.iDisplayLength;
					iDisplayLengthvalue = parseInt(req.query.iDisplayLength) + parseInt(skiprecord);
				}
				achhistoryData = achhistoryData.slice(skiprecord, iDisplayLengthvalue);

				var achreconuser = [];
				achhistoryData.forEach(function (achdata, loopvalue) {

					loopid = loopvalue + skiprecord + 1;

					var payuserName = '';
					var payuserscreenName = '';
					var payuserEmail = '';
					var payuserphoneNumber = '';
					if (achdata.user) {
						if (achdata.user.name != '' && achdata.user.name != null) {
							var payuserName = achdata.user.name;
						}
						if (achdata.user.screenName != '' && achdata.user.screenName != null) {
							var payuserscreenName = achdata.user.screenName;
						}
						if (achdata.user.email != '' && achdata.user.email != null) {
							var payuserEmail = achdata.user.email;
						}
						if (achdata.user.phoneNumber != '' && achdata.user.phoneNumber != null) {
							var payuserphoneNumber = achdata.user.phoneNumber;
						}
					}

					achdata.createdAt = moment(achdata.createdAt).format('MM-DD-YYYY');

					var achmethodType = '';
					var achapiStatus = '';
					var achappStatus = '';
					var achapiresponseStatus = '';
					if (achdata.methodtype == 3) {
						var achmethodType = 'ACHCredit';
					}

					if (achdata.methodtype == 4) {
						var achmethodType = 'ACHDebit';
					}

					if (achdata.methodtype == 5) {
						var achmethodType = 'ACHFailure';
					}

					if (achdata.apistatus == 1) {
						var achapiStatus = 'Success';
					}
					if (achdata.apistatus == 0) {
						var achapiStatus = 'Failure';
					}

					if (achdata.appfailure == 1) {
						var achappStatus = 'Failure';
					}
					if (achdata.appfailure == 0) {
						var achappStatus = 'Success';
					}

					if (achdata.apiresponsestatus == 1) {
						var achapiresponseStatus = 'Success';
					}
					if (achdata.apiresponsestatus == 0) {
						var achapiresponseStatus = 'Failed';
					}
					if (achdata.apiresponsestatus == 3) {
						var achapiresponseStatus = 'Processing';
					}

					systemUniqueKeyURL = 'viewreconciliationDetails/' + achdata.id;

					if (achdata.loanID != '' && achdata.loanID != null) {
						var payloanID = '<a href=\'' + systemUniqueKeyURL + '\'>' + achdata.loanID + '</a>';
					} else {
						var payloanID = '--';
					}

					var actiondata = '<a href="/admin/viewreconciliationDetails/' + achdata.id + '"><i class="fa fa-eye" aria-hidden="true" style="cursor:pointer;color:#337ab7;"></i></a>';


					if (achdata.methodtype == 3) {
						if (achdata.paymentManagement.transferstatus == 0) {
							var apitransactiontatus = '--';
						}

						if (achdata.paymentManagement.transferstatus == 1) {
							var apitransactiontatus = 'Pending';
						}

						if (achdata.paymentManagement.transferstatus == 2) {
							var apitransactiontatus = 'Settled';
						}
					}
					else if (achdata.methodtype == 4) {

						if (achdata.apiresponse && achdata.apiresponsestatus == 1) {
							var loanID = achdata.loanID;
							var achType = achdata.achType;


							if (achType == 'loan') {
								var filteredTransactions = _.filter(achdata.paymentManagement.usertransactions, { "loanID": loanID });

								if (filteredTransactions.length == 1) {
									var transactionToCheck = filteredTransactions[0];

									if (transactionToCheck.status == 2) {
										var apitransactiontatus = 'Settled';
									}
									else if (transactionToCheck.status == 1) {
										var apitransactiontatus = 'Pending';
									}
									else {
										var apitransactiontatus = 'Failed';
									}
								}
								else {
									var apitransactiontatus = 'Failed';
								}
								//var apitransactiontatus ='Settled';
							}
							else if (achType == 'creditscore' || achType == 'creditscorerenewal' || achType == 'creditscoremanualrenewal') {
								var achcriteria = {
									user: achdata.user.id
								};

								var apitransactiontatus = 'Settled';

								/*Creditusers
									.findOne(achcriteria)
									.then(function(credituserDetails) {
	
	
												if(credituserDetails.userpayments)
												{
	
													var filteredTransactions = _.filter(credituserDetails.userpayments, {"loanID": loanID});
	
													if (filteredTransactions.length == 1) {
															var transactionToCheck = filteredTransactions[0];
	
															if(transactionToCheck.status==2)
															{
																var apitransactiontatus ='Settled';
															}
															else if(transactionToCheck.status==1)
															{
																var apitransactiontatus ='Pending';
															}
															else
															{
																var apitransactiontatus ='Failed';
															}
													}
													else
													{
														var apitransactiontatus ='Failed';
													}
	
												}
												else
												{
													var apitransactiontatus ='Settled';
												}
									});*/
							}
							else {
								var apitransactiontatus = 'Failed';
							}
						}
						else {
							var apitransactiontatus = 'Failed';
						}
					}
					else {
						var apitransactiontatus = 'Failed';
					}

					achreconuser.push({ loopid: loopid, loanID: payloanID, name: payuserName, screenName: payuserscreenName, email: payuserEmail, phoneNumber: payuserphoneNumber, achAmount: achdata.achAmount, methodtype: achmethodType, apiresponsestatus: achapiresponseStatus, apitransactiontatus: apitransactiontatus, appfailure: achappStatus, appfailuremessage: achdata.appfailuremessage, createdAt: achdata.createdAt, actiondata: actiondata });
				});

				var json = {
					sEcho: req.query.sEcho,
					iTotalRecords: totalrecords,
					iTotalDisplayRecords: totalrecords,
					aaData: achreconuser
				};
				res.contentType('application/json');
				res.json(json);
			}
		});
}


function showAllDeniedAction(req, res) {

	var newLoanupdateSuccessMsg = '';
	var newLoanupdateMsg = '';
	if ("undefined" !== typeof req.session.newLoanupdateSuccessMsg && req.session.newLoanupdateSuccessMsg != '' && req.session.newLoanupdateSuccessMsg != null) {
		newLoanupdateSuccessMsg = req.session.newLoanupdateSuccessMsg;
		req.session.newLoanupdateSuccessMsg = '';
	}
	if ("undefined" !== typeof req.session.newLoanupdateMsg && req.session.newLoanupdateMsg != '' && req.session.newLoanupdateMsg != null) {
		newLoanupdateMsg = req.session.newLoanupdateMsg;
		req.session.newLoanupdateMsg = '';
	}
	//req.session.viewType= 'denied';
	var responsedata = {
		newLoanupdateSuccessMsg: newLoanupdateSuccessMsg,
		newLoanupdateMsg: newLoanupdateMsg
	};
	res.view("admin/pendingach/deniedachlist", responsedata);
}

function showAllArchivedDeniedAction(req, res) {

	var newLoanupdateSuccessMsg = '';
	var newLoanupdateMsg = '';
	if ("undefined" !== typeof req.session.newLoanupdateSuccessMsg && req.session.newLoanupdateSuccessMsg != '' && req.session.newLoanupdateSuccessMsg != null) {
		newLoanupdateSuccessMsg = req.session.newLoanupdateSuccessMsg;
		req.session.newLoanupdateSuccessMsg = '';
	}
	if ("undefined" !== typeof req.session.newLoanupdateMsg && req.session.newLoanupdateMsg != '' && req.session.newLoanupdateMsg != null) {
		newLoanupdateMsg = req.session.newLoanupdateMsg;
		req.session.newLoanupdateMsg = '';
	}
	//req.session.viewType= 'deniedArchive';
	var responsedata = {
		newLoanupdateSuccessMsg: newLoanupdateSuccessMsg,
		newLoanupdateMsg: newLoanupdateMsg
	};
	res.view("admin/pendingach/deniedArchivedachlist", responsedata);
}

function showAllToDoItemsDeniedAction(req, res) {

	var newLoanupdateSuccessMsg = '';
	var newLoanupdateMsg = '';
	if ("undefined" !== typeof req.session.newLoanupdateSuccessMsg && req.session.newLoanupdateSuccessMsg != '' && req.session.newLoanupdateSuccessMsg != null) {
		newLoanupdateSuccessMsg = req.session.newLoanupdateSuccessMsg;
		req.session.newLoanupdateSuccessMsg = '';
	}
	if ("undefined" !== typeof req.session.newLoanupdateMsg && req.session.newLoanupdateMsg != '' && req.session.newLoanupdateMsg != null) {
		newLoanupdateMsg = req.session.newLoanupdateMsg;
		req.session.newLoanupdateMsg = '';
	}
	//req.session.viewType= 'deniedTodo';
	var responsedata = {
		newLoanupdateSuccessMsg: newLoanupdateSuccessMsg,
		newLoanupdateMsg: newLoanupdateMsg
	};
	res.view("admin/pendingach/deniedToDoItemachlist", responsedata);
}

function ajaxDeniedApplicationAction(req, res) {
	let checkCreatedDate = moment().startOf('day').subtract(60, "days").format('MM-DD-YYYY');
	checkCreatedDate = moment(checkCreatedDate).tz("America/Los_Angeles").startOf('day').format('MM-DD-YYYY');
	let viewtype = 'denied';
	let totalrecords = 0;
	let skiprecord = 0;
	let checklimitrecords = 0;
	let iDisplayLengthvalue = 0;
	let options = {};
	if ("undefined" !== req.param("viewtype") && req.param("viewtype") != "" && req.param("viewtype") != null) {
		viewtype = req.param("viewtype");
	}
	// search queries
	if ("undefined" !== typeof req.session.adminpracticeID && req.session.adminpracticeID != "" && req.session.adminpracticeID != null) {
		if (viewtype == 'denied') {
			options = {
				status: ['OPENED', 'DENIED'],
				achstatus: { $eq: 2, $exists: true },
				practicemanagement: req.session.adminpracticeID,
				$and: [
					{
						$or:
							[
								{ moveToArchive: { $eq: 0, $exists: true } },
								{
									$and:
										[
											{ moveToArchive: { $exists: false } },
											{ createdAt: { $gte: new Date(checkCreatedDate), $exists: true } }
										]
								}
							]
					},
				]
			};
		} else if (viewtype == 'archived') {
			options = {
				status: ['OPENED', 'DENIED'],
				achstatus: { $eq: 2, $exists: true },
				practicemanagement: req.session.adminpracticeID,
				$and: [
					{
						$or:
							[
								{ moveToArchive: { $eq: 1, $exists: true } },
								{
									$and:
										[
											{ moveToArchive: { $exists: false } },
											{ createdAt: { $lt: new Date(checkCreatedDate), $exists: true } }
										]
								}
							]
					},
				]
			};
		} else if (viewtype == 'toDoItems') {
			options = {
				status: ['OPENED', 'DENIED'],
				achstatus: { $eq: 2, $exists: true },
				practicemanagement: req.session.adminpracticeID,
				appverified: { $eq: 0, $exists: true }
			};
		} else {
			options = {
				status: ['OPENED', 'DENIED'],
				achstatus: { $eq: 2, $exists: true },
				practicemanagement: req.session.adminpracticeID,
				$and: [
					{
						$or: [
							{ moveToArchive: { $eq: 0, $exists: true } },
							// { $and: [
							// 	{ moveToArchive:{ $exists: false }},
							// 	{ createdAt:{ $gte : new Date(checkCreatedDate), $exists: true } }
							// ] }
						]
					},
				]
			};
		}
	} else {
		if (viewtype == 'denied') {
			options = {
				status: ['OPENED', 'DENIED'],
				achstatus: { $eq: 2, $exists: true },
				$and: [
					{
						$or: [
							{ moveToArchive: { $eq: 0, $exists: true } },
							{
								$and: [
									{ moveToArchive: { $exists: false } },
									{ createdAt: { $gte: new Date(checkCreatedDate), $exists: true } }
								]
							}
						]
					},
				]
			};
		} else if (viewtype == 'archived') {
			options = {
				status: ['OPENED', 'DENIED'],
				achstatus: { $eq: 2, $exists: true },
				$and: [
					{
						$or: [
							{ moveToArchive: { $eq: 1, $exists: true } },
							{
								$and: [
									{ moveToArchive: { $exists: false } },
									{ createdAt: { $lt: new Date(checkCreatedDate), $exists: true } }
								]
							}
						]
					},
				]
			};
		} else if (viewtype == 'toDoItems') {
			options = {
				status: ['OPENED', 'DENIED'],
				achstatus: { $eq: 2, $exists: true },
				appverified: { $eq: 0, $exists: true }
			};
		} else {
			options = {
				status: ['OPENED', 'DENIED'],
				achstatus: { $eq: 2, $exists: true },
				$and: [
					{
						$or: [
							{ moveToArchive: { $eq: 0, $exists: true } },
							{
								$and: [
									{ moveToArchive: { $exists: false } },
									{ createdAt: { $gte: new Date(checkCreatedDate), $exists: true } }
								]
							}
						]
					},
				]
			};
		}
	}

	PaymentManagement.find(options)
		.populate("user")
		.populate("practicemanagement")
		.populate("screentracking")
		.exec(function (err, paymentmanagementdata) {
			if (err) {
				res.send(500, { error: 'DB error' });
			} else {
				if (req.query.sSortDir_0 == 'desc') {
					switch (req.query.iSortCol_0) {
						case '1': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'loanReference').reverse(); break;
						case '2': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.name').reverse(); break;
						case '3': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.email').reverse(); break;
						case '4': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.phoneNumber').reverse(); break;
						case '5': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'practicemanagement.PracticeName').reverse(); break;
						case '6': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'createdAt').reverse(); break;
						case '7': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'updatedAt').reverse(); break;
						case '8': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'achstatus').reverse(); break;
						case '10': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.registertype'); break;
						default: break;
					};

				}
				else {
					switch (req.query.iSortCol_0) {
						case '1': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'loanReference'); break;
						case '2': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.name'); break;
						case '3': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.email'); break;
						case '4': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.phoneNumber'); break;
						case '5': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'practicemanagement.PracticeName'); break;
						case '6': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'createdAt'); break;
						case '7': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'updatedAt'); break;
						case '8': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'achstatus'); break;
						case '10': paymentmanagementdata = _.sortBy(paymentmanagementdata, 'user.registertype'); break;
						default: break;
					};
				}
				//Filter user details not available
				paymentmanagementdata = _.filter(paymentmanagementdata, function (item) {
					if (item.user) {
						return true;
					}
				});
				//Filter using search data
				if (req.query.sSearch) {
					let search = req.query.sSearch.toLowerCase();
					paymentmanagementdata = _.filter(paymentmanagementdata, function (item) {
						if (item.loanReference != null) {
							if (item.loanReference.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}
						if (item.user.firstname != null) {
							if (item.user.firstname.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}
						if (item.user.email != null) {
							if (item.user.email.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}
						if (item.user.phoneNumber != null) {
							if (item.user.phoneNumber.indexOf(search) > -1) {
								return true;
							}
						}
						if (item.practicemanagement) {
							if (item.practicemanagement.PracticeName != null) {
								if (item.practicemanagement.PracticeName.indexOf(search) > -1) {
									return true;
								}
							}
						}
						if (item.createdAt != null) {
							if (moment(item.createdAt).format('MM-DD-YYYY') == search) {
								return true;
							}
						}
						if (item.updatedAt != null) {
							if (moment(item.updatedAt).format('MM-DD-YYYY') == search) {
								return true;
							}
						}
						if (item.achstatus != null) {
							if (item.achstatus.indexOf(search) > -1) {
								return true;
							}
						}
						if (item.user.registeredtype != null) {
							if (item.user.registeredtype.toLowerCase().indexOf(search) > -1) {
								return true;
							}
						}
						return false;
					});
				}
				//total records count
				totalrecords = paymentmanagementdata.length;

				//Filter by limit records
				let p = parseInt(req.query.iDisplayStart) + 1;
				skiprecord = parseInt(req.query.iDisplayStart);
				checklimitrecords = skiprecord + parseInt(req.query.iDisplayLength);
				if (checklimitrecords > totalrecords) {
					iDisplayLengthvalue = totalrecords;
				} else {
					iDisplayLengthvalue = parseInt(req.query.iDisplayLength) + parseInt(skiprecord);
				}
				paymentmanagementdata = paymentmanagementdata.slice(skiprecord, iDisplayLengthvalue);

				// Final output starts here
				var pendinguser = [];
				paymentmanagementdata.forEach(function (paydata, loopvalue) {
					let loopid = loopvalue + skiprecord + 1;
					let payloanReference = "--";
					let payuserName = "--";
					let payuserEmail = "--";
					let payuserphoneNumber = "--";
					let practicename = "--";
					let createdAt;
					let updatedAt;
					let statusicon = "--";
					let status = "Current";
					let registeredType = "--";

					let systemUniqueKeyURL = 'getAchUserDetails/' + paydata.id;
					if (paydata.loanReference != "" && paydata.loanReference != null) {
						payloanReference = '<a href=\'' + systemUniqueKeyURL + '\'>' + paydata.loanReference + '</a>';
					}
					if (paydata.user) {
						if (paydata.user.firstname != "" && paydata.user.firstname != null) {
							payuserName = paydata.user.firstname + ' ' + paydata.user.lastname;
						}
						if (paydata.user.email != '' && paydata.user.email != null) {
							payuserEmail = paydata.user.email;
						}
						if (paydata.user.phoneNumber != '' && paydata.user.phoneNumber != null) {
							payuserphoneNumber = paydata.user.phoneNumber;
						}
						if (paydata.user.registeredtype != "" && paydata.user.registeredtype) {
							registeredType = paydata.user.registeredtype;
						}
					}
					if (paydata.practicemanagement) {
						if (paydata.practicemanagement.PracticeName != '' && paydata.practicemanagement.PracticeName != null) {
							practicename = paydata.practicemanagement.PracticeName;
						}
					}
					if (paydata.createdAt) {
						createdAt = moment(paydata.createdAt).format('MM-DD-YYYY');
					}
					if (paydata.updatedAt) {
						updatedAt = moment(paydata.updatedAt).format('MM-DD-YYYY');
					}
					// status icon
					if (paydata.achstatus == 0) {
						statusicon = '<i class=\'fa fa-circle text-warning\' aria-hidden=\'true\' ></i>&nbsp;&nbsp;Pending';
					}
					if (paydata.achstatus == 1) {
						statusicon = '<i class=\'fa fa-circle text-success\' aria-hidden=\'true\' ></i>&nbsp;&nbsp;Approved';
					}
					if (paydata.achstatus == 2) {
						if (paydata.deniedfromapp == 1) {
							statusicon = '<i class=\'fa fa-circle text-danger\' aria-hidden=\'true\' ></i>&nbsp;&nbsp;Denied (from app)';
						} else {
							statusicon = '<i class=\'fa fa-circle text-danger\' aria-hidden=\'true\' ></i>&nbsp;&nbsp;Denied';
						}
					}
					let setcurrent = 0;
					_.forEach(paydata.paymentSchedule, function (payDetails) {
						const todaysDate = moment().startOf('day').toDate().getTime();
						const scheduleDate = moment(payDetails.date).add(15, 'days').startOf('day').toDate().getTime();
						if (setcurrent == 0) {
							if (scheduleDate < todaysDate && payDetails.status == 'OPENED') {
								status = "Late";
								setcurrent = 1;
							} else if (paydata.status == "OPENED" || paydata.status == "CURRENT") {
								status = "Current";
							}
						}
					});

					pendinguser.push({
						loopid: loopid,
						loanReference: payloanReference,
						name: payuserName,
						email: payuserEmail,
						phoneNumber: payuserphoneNumber,
						practicename: practicename,
						createdAt: createdAt,
						updatedAt: updatedAt,
						status: statusicon,
						paymentstatus: status,
						registeredType: registeredType
					});

				});

				var json = {
					sEcho: req.query.sEcho,
					iTotalRecords: totalrecords,
					iTotalDisplayRecords: totalrecords,
					aaData: pendinguser
				};
				res.contentType('application/json');
				res.json(json);
			}
		});
}

function viewreconciliationDetails(req, res) {

	var achhistoryID = req.param('id');

	if (!achhistoryID) {
		var errors = {
			"code": 500,
			"message": "Invalid Data"
		};
		sails.log.error('AchController#viewreconciliationDetails :: errors', errors);
		res.view("admin/error/500", {
			data: errors.message,
			layout: 'layout'
		});
	}

	var options = {
		id: achhistoryID
	};

	Achhistory.findOne(options)
		.populateAll()
		.then(function (achhistoryData) {

			var apiresponse = '';
			var apirequest = '';
			if (achhistoryData.apiresponse) {
				apiresponse = JSON.stringify(achhistoryData.apiresponse, null, 4);
			}

			if (achhistoryData.apirequest) {
				apirequest = JSON.stringify(achhistoryData.apirequest, null, 4);
			}
			achhistoryData.createdAt = moment(achhistoryData.createdAt).format('MM-DD-YYYY');

			var achmethodType = '';
			var achapiStatus = '';
			var achappStatus = '';
			var achapiresponseStatus = '';
			if (achhistoryData.methodtype == 3) {
				var achmethodType = 'ACHCredit';
			}

			if (achhistoryData.methodtype == 4) {
				var achmethodType = 'ACHDebit';
			}

			if (achhistoryData.methodtype == 5) {
				var achmethodType = 'ACHFailure';
			}

			if (achhistoryData.apistatus == 1) {
				var achapiStatus = 'Success';
			}
			if (achhistoryData.apistatus == 0) {
				var achapiStatus = 'Failure';
			}

			if (achhistoryData.appfailure == 1) {
				var achappStatus = 'Failure';
			}
			if (achhistoryData.appfailure == 0) {
				var achappStatus = 'Success';
			}


			if (achhistoryData.apiresponsestatus == 1) {
				var achapiresponseStatus = 'Success';
			}
			if (achhistoryData.apiresponsestatus == 0) {
				var achapiresponseStatus = 'Failed';
			}
			if (achhistoryData.apiresponsestatus == 3) {
				var achapiresponseStatus = 'Processing';
			}

			var achType = achhistoryData.achType;
			if (achhistoryData.methodtype == 3) {

				if (achType == 'creditscore' || achType == 'creditscorerenewal' || achType == 'creditscoremanualrenewal') {
					var apitransactiontatus = 'Settled';
				}

				if (achType == 'loan') {
					if (achhistoryData.paymentManagement.transferstatus == 0) {
						var apitransactiontatus = '--';
					}

					if (achhistoryData.paymentManagement.transferstatus == 1) {
						var apitransactiontatus = 'Pending';
					}

					if (achhistoryData.paymentManagement.transferstatus == 2) {
						var apitransactiontatus = 'Settled';
					}
				}
			}
			else if (achhistoryData.methodtype == 4) {
				if (achhistoryData.apiresponse && achhistoryData.apiresponsestatus == 1) {
					if (achType == 'creditscore' || achType == 'creditscorerenewal' || achType == 'creditscoremanualrenewal') {
						var apitransactiontatus = 'Settled';
					}
					if (achType == 'loan') {
						var loanID = achhistoryData.loanID;

						var filteredTransactions = _.filter(achhistoryData.paymentManagement.usertransactions, { "loanID": loanID });

						if (filteredTransactions.length == 1) {
							var transactionToCheck = filteredTransactions[0];

							if (transactionToCheck.status == 2) {
								var apitransactiontatus = 'Settled';
							}
							else if (transactionToCheck.status == 1) {
								var apitransactiontatus = 'Pending';
							}
							else {
								var apitransactiontatus = 'Failed';
							}
						}
						else {
							var apitransactiontatus = 'Failed';
						}
					}
				}
				else {
					var apitransactiontatus = 'Failed';
				}
			}
			else {
				var apitransactiontatus = 'Failed';
			}

			var responsedata = {
				achhistoryData: achhistoryData,
				apirequest: apirequest,
				apiresponse: apiresponse,
				achmethodType: achmethodType,
				achapiStatus: achapiStatus,
				achappStatus: achappStatus,
				achapiresponseStatus: achapiresponseStatus,
				apitransactiontatus: apitransactiontatus,
			}
			res.view("admin/reconciliation/viewReconciliationDetails", responsedata);
		})
		.catch(function (err) {
			var errors = err.message;
			sails.log.error('AchController#viewreconciliationDetails :: err', errors);
			res.view("admin/error/404", {
				data: err.message,
				layout: 'layout'
			});
		});
}

function storyUserviewinfo(req, res) {

	var payID = req.param('paymentID');
	var type = req.param('type');
	var typecount = req.param('typecount');

	if (payID) {
		var options = {
			id: payID
		};

		PaymentManagement.findOne(options)
			.populate('user')
			.populate('story')
			.then(function (paymentmanagementdata) {


				var userviewData = [];
				var userinfoData = [];
				if (type == 'like') {
					var userviewData = paymentmanagementdata.story.likers;
				}
				if (type == 'dislike') {
					var userviewData = paymentmanagementdata.story.dislikers;
				}

				if (typecount > 0) {
					var forlength = userviewData.length,
						i = 0;
					var userIds = [];
					_.forEach(userviewData, function (userData) {
						userData.userdate = moment(userData.timeStamp).format('MM-DD-YYYY');
						userIds.push(userData.userId);
					});


					var criteria = {
						id: userIds
					};

					User
						.find(criteria)
						.then(function (users) {


							var json = {
								status: 200,
								message: "Information found",
								data: users
							};
							res.contentType('application/json');
							res.json(json);


						})
						.catch(function (err) {

						})
				}
				else {
					var json = {
						status: 400,
						message: 'No information found'
					};
					//sails.log.error("json data", json);
					res.contentType('application/json');
					res.json(json);
				}

			})
			.catch(function (err) {
				var json = {
					status: 400,
					message: err.message
				};
				//sails.log.error("json data", json);
				res.contentType('application/json');
				res.json(json);
			});
	}
	else {
		var json = {
			status: 400,
			message: 'No information found'
		};
		//sails.log.error("json data", json);
		res.contentType('application/json');
		res.json(json);
	}
}

function incompleteUploadDocumentProofAction(req, res) {

	var localPath = req.localPath;
	var screenID = req.param('paymentID');

	var docutype = req.param('docutype');
	if (docutype == 'Others') {
		if (!req.form.isValid) {
			var validationErrors = ValidationService
				.getValidationErrors(req.form.getErrors());
			return res.failed(validationErrors);
		}
		var document_name = req.param('documentname');
		if (screenID) {
			var payid = {
				id: screenID
			};

			PaymentManagement.findOne(payid).then(function (userdetails) {
				var user_id = userdetails.user;
				var formdata = {
					docname: document_name,
					user: user_id,
					paymentManagement: screenID
				};

				Achdocuments
					.createAchDocuments(formdata, screenID)
					.then(function (achdocuments) {
						User.findOne(user_id).then(function (data) {

							var userReference = data.userReference;
							var userid = {
								user: user_id
							};
							Screentracking.findOne(userid).then(function (value) {
								var applicationReference = value.applicationReference;
								Asset
									.createAssetForAchDocuments(achdocuments, localPath, userReference, applicationReference, Asset.ASSET_TYPE_USER_DOCUMENT)
									.then(function (asset) {
										var docdetals = asset;
										docdetals.docs = achdocuments;
										var modulename = 'Upload  Documents';
										var modulemessage = 'Applications Documents updated successfully';
										req.achlog = 1;
										req.payID = screenID;
										req.logdata = docdetals;

										Logactivity.registerLogActivity(req, modulename, modulemessage);

										Achdocuments
											.updateDocumentProof(achdocuments, asset).then(function (value) {
												var json = {
													status: 200,
													message: "Documents updated successfully"
												};

												var redirectpath = "/admin/getAchUserDetails/" + screenID;
												return res.status(200).redirect(redirectpath);
											})
									})
							})
						})
					})
					.catch(function (err) {
						sails.log.error("Ach#uploadAchDocuments  :: Error :: ", err);
						return reject({
							code: 500,
							message: 'INTERNAL_SERVER_ERROR'
						});
					});
			})
				.catch(function (err) {
					sails.log.error('AchController#createAchDocuments :: err :', err);
					return res.handleError(err);
				});
		}
	} else {
		if (screenID) {
			var payid = {
				id: screenID
			};

			Screentracking.findOne(payid).then(function (userdetails) {
				var user_id = userdetails.user;
				var formdata = {
					docname: docutype,
					user: user_id,
					screentracking: screenID
				};


				Achdocuments
					.createAchDocuments(formdata, screenID)
					.then(function (achdocuments) {
						User.findOne(user_id).then(function (data) {
							var userReference = data.userReference;
							var userid = {
								user: user_id
							};
							Screentracking.findOne(userid).then(function (value) {
								var applicationReference = value.applicationReference;
								Asset
									.createAssetForAchDocuments(achdocuments, localPath, userReference, applicationReference, Asset.ASSET_TYPE_USER_DOCUMENT)
									.then(function (asset) {
										var docdetals = asset;
										docdetals.docs = achdocuments;
										var modulename = 'Upload Pending Applications Documents';
										var modulemessage = 'Pending Applications Documents updated successfully';
										req.achlog = 1;
										req.payID = screenID;
										req.logdata = docdetals;
										Logactivity.registerLogActivity(req, modulename, modulemessage);

										Achdocuments
											.updateDocumentProof(achdocuments, asset).then(function (value) {
												var json = {
													status: 200,
													message: "Documents updated successfully"
												};
												var redirectpath = "/admin/getAchUserDetails/" + screenID;

												return res.status(200).redirect(redirectpath);
											})
									})
							})
						})
					})
					.catch(function (err) {
						sails.log.error("Ach#uploadAchDocuments  :: Error :: ", err);
						return reject({
							code: 500,
							message: 'INTERNAL_SERVER_ERROR'
						});
					});
			})
				.catch(function (err) {
					sails.log.error('AchController#createAchDocuments :: err :', err);
					return res.handleError(err);
				});
		}
	}
}

function userPaymentHistoryAction(req, res) {
	res.view("admin/pendingach/paymenthistorylist");

}


function cancelAchAction(req, res) {
	var scheduleStatus = req.param('scheduleStatus');
	var userId = req.param('userID');
	var paymentId = req.param('paymentID');
	var status = req.param('reasoncomment');
	var processType = req.param('scheduleStatus');
	var reversalAmount = "";

	if (processType == 5) {
		var scheduleStatus = 'PAID OFF'
	} else {
		var scheduleStatus = 'CLOSED'
	}

	VikingRequest.update({ payment_id: paymentId, userId: userId, processType: 1 }, { status: status, processType: parseInt(processType) })
		.exec(function afterwards(err, updated) {
			if (err) {
				req.session.approveerror = '';
				req.session.approveerror = 'Unable to update the status.';
				return res.redirect("admin/getAchDetails");
			} else {
				sails.log.info("UPDATED", updated);
				if (req.param('reversalApprove') == "yes") {
					VikingRequest.findOne({ payment_id: paymentId, userId: userId, lenderType: 'credit' })
						.then(function (vikingData) {
							sails.log.info("vikingData", vikingData);
							var uniqueReferenceID = 'VK_' + Math.random().toString(10).slice(10);
							var randomToken = "VIKING_" + Math.random().toString(32).substr(6) + Math.random().toString(32).substr(6);
							var feildDataWithLabel = ({ consumerName: vikingData.consumerName, uniqueID: uniqueReferenceID, routingNumber: vikingData.routingNumber, consumersBankAccount: vikingData.consumersBankAccount, amount: vikingData.amount, scheduleDate: moment().format(), streetAddress: vikingData.streetAddress, city: vikingData.city, state: vikingData.state, zip: vikingData.zip, SSN: vikingData.SSN, userId: userId, payment_id: paymentId, uniqueScheduleId: randomToken, status: 'pending', processType: 1, lenderType: 'debit', entryType: 'reversal' });
							VikingRequest.createRequestData(feildDataWithLabel)
								.then(function (vikingDataResult) {
									User.findOne({ id: userId })
										.then(function (userdata) {
											var modulename = 'Vikng Reversal';
											var modulemessage = 'Viking reversed $' + vikingDataResult.amount + '(dr) successfully for user reference: ' + userdata.userReference;
											req.logdata = {
												userdata: userdata,
												changetype: "Viking Cancel",
												userID: userId,
												paydetailID: paymentId
											};
											req.payID = paymentId;
											Logactivity.registerLogActivity(req, modulename, modulemessage);
										});
								});

						});
				}
				PaymentManagement.findOne({ id: paymentId })
					.then(function (paymentDet) {

						if (paymentDet) {
							sails.log.info("paymentDet", paymentDet);
							var i = 1;
							paymentDet.finalpayoffAmount = 0.00;
							paymentDet.finalpayoffAmount = 0.00;
							paymentDet.status = scheduleStatus;
							_.forEach(paymentDet.paymentSchedule, function (payDetails) {
								if (payDetails.status != 'PAID OFF') {
									payDetails.status = scheduleStatus;
								}
								//payDetails.amount = 0.00;
								if (i == paymentDet.paymentSchedule.length) {
									paymentDet.save(function (err, updated) {
										sails.log.info("updated-2", updated);
										if (err) {
											req.session.approveerror = '';
											req.session.approveerror = 'Status Updated in viking, Failed to update in Frontend status.';
											return res.redirect("admin/getAchDetails");
										} else {
											User.findOne({ id: userId })
												.then(function (userdata) {
													var modulename = 'Payment Schedule updated';
													var modulemessage = 'Changed Payment Schedule Status to ' + scheduleStatus + ' successfully for user reference: ' + userdata.userReference;
													req.logdata = {
														userdata: userdata,
														changetype: "Viking Cancel",
														userID: userId,
														paydetailID: paymentId
													};
													req.payID = paymentId;
													Logactivity.registerLogActivity(req, modulename, modulemessage);
												});

											req.session.approveerror = '';
											req.session.approveerror = 'Status Updated Successfully.';
											return res.redirect("admin/getAchDetails");
										}
									});
								}
								i++;
							});
						} else {
							req.session.approveerror = '';
							req.session.approveerror = 'Status Updated in viking, Failed to update in Frontend status.';
							return res.redirect("admin/getAchDetails");
						}
					}).catch(function (err) {
						req.session.approveerror = '';
						req.session.approveerror = 'Status Updated in viking, Failed to update in Frontend status.';
						return res.redirect("admin/getAchDetails");
					});
			}
		});

}




function repullPayment(req, res) {

	var paymentId = req.param('paymentId');
	var scheduleId = req.param('scheduleId');
	var uniqueScheduleId = req.param('uniqueScheduleId');

	sails.log.info("uniqueScheduleId0000000000: ", uniqueScheduleId);

	if (paymentId && ("undefined" !== typeof uniqueScheduleId && uniqueScheduleId != '' && uniqueScheduleId != null)) {
		PaymentManagement
			.adminrepullpayment(paymentId, scheduleId, req, uniqueScheduleId)
			.then(function (responsedetails) {

				sails.log.info("responsedetails: ", responsedetails);

				if (responsedetails.status == 200) {
					req.session.repullpaysucessmsg = '';
					req.session.repullpaysucessmsg = 'Manual repull payment processed successfully from admin';
					var json = {
						status: 200,
						message: 'Successfully repull payment from admin'
					};
					res.contentType('application/json');
					res.json(json);
				}
				else if (responsedetails.status == 402) {
					//--pull plaid before payment
					req.session.repullpaysucessmsg = '';
					req.session.repullpaysucessmsg = responsedetails.message;
					var json = {
						status: 400,
						message: schudledetails.message
					};
					res.contentType('application/json');
					res.json(json);
				}
				else {
					req.session.repullpayerrormsg = '';
					req.session.repullpayerrormsg = 'Unable to repull payment from admin';
					var json = {
						status: 400,
						message: 'Unable to repull payment from admin'
					};
					res.contentType('application/json');
					res.json(json);
				}
			})
			.catch(function (err) {
				var json = {
					status: 400,
					message: 'Unable to repull payment from admin'
				};
				res.contentType('application/json');
				res.json(json);
			});
	}
	else {
		var json = {
			status: 400,
			message: 'Unable to repull payment from admin'
		};
		res.contentType('application/json');
		res.json(json);
	}
}

function showPotentialDefaultusers(req, res) {

	var errorval = '';
	var successmsg = '';
	if (req.session.errorval != '') {
		errorval = req.session.errorval;
		req.session.errorval = '';
	}
	if (req.session.successmsg != '') {
		successmsg = req.session.successmsg;
		req.session.successmsg = '';
	}
	var responsedata = {
		errorval: errorval,
		successmsg: successmsg
	};

	res.view("admin/pendingach/potentialdefaultuser", responsedata);
}

function ajaxPotentialDefaultusers(req, res) {

	//Sorting
	if (req.query.sSortDir_0 == 'desc') {
		sorttype = -1;
	}
	else {
		sorttype = 1;
	}
	switch (req.query.iSortCol_0) {
		case '0': var sorttypevalue = { '_id': sorttype }; break;
		case '1': var sorttypevalue = { 'loanReference': sorttype }; break;
		case '2': var sorttypevalue = { 'storydata.storyReference': sorttype }; break;
		case '3': var sorttypevalue = { 'user.userReference': sorttype }; break;
		case '4': var sorttypevalue = { 'user.name': sorttype }; break;
		case '6': var sorttypevalue = { 'user.email': sorttype }; break;
		case '7': var sorttypevalue = { 'user.phoneNumber': sorttype }; break;
		case '8': var sorttypevalue = { 'payOffAmount': sorttype }; break;
		case '11': var sorttypevalue = { 'maturityDate': sorttype }; break;
		case '12': var sorttypevalue = { 'createdAt': sorttype }; break;
		default: break;
	};

	var matchcriteria;
	var whereConditionAnd = new Array();
	var whereConditionOr = new Array();
	if (req.query.sSearch) {
		whereConditionOr.push({ "loanReference": { '$regex': req.query.sSearch, $options: 'i' } });
		whereConditionOr.push({ "storydata.storyReference": { '$regex': req.query.sSearch, $options: 'i' } });
		whereConditionOr.push({ "userdata.userReference": { '$regex': req.query.sSearch, $options: 'i' } });
		whereConditionOr.push({ "userdata.name": { '$regex': req.query.sSearch, $options: 'i' } });
		whereConditionOr.push({ "userdata.email": { '$regex': req.query.sSearch, $options: 'i' } });
		whereConditionOr.push({ "userdata.phoneNumber": { '$regex': req.query.sSearch, $options: 'i' } });
		whereConditionOr.push({ "payOffAmount": { '$regex': req.query.sSearch, $options: 'i' } });
	}

	if (whereConditionOr.length > 0) {
		matchcriteria = {
			"userdata": { $ne: [] },
			"storydata": { $ne: [] },
			"accountdata": { $ne: [] },
			$or: [{ status: 'OPENED' }, { status: 'PAID OFF' }],
			achstatus: { $eq: 1, $exists: true },
			potentialdefaultexist: { $eq: 1, $exists: true },
			$or: whereConditionOr
		};
	}
	else {
		matchcriteria = {
			"userdata": { $ne: [] },
			"storydata": { $ne: [] },
			"accountdata": { $ne: [] },
			$or: [{ status: 'OPENED' }, { status: 'PAID OFF' }],
			achstatus: { $eq: 1, $exists: true },
			potentialdefaultexist: { $eq: 1, $exists: true }
		};
	}

	//sails.log.info("Match criteria",JSON.stringify(matchcriteria));

	skiprecord = parseInt(req.query.iDisplayStart);
	iDisplayLength = parseInt(req.query.iDisplayLength);

	var potentialData = [];
	totalrecords = 0;

	//-- Total records count
	PaymentManagement.native(function (err, collection) {

		collection.aggregate(
			[
				{
					$lookup: {
						from: "user",
						localField: "user",
						foreignField: "_id",
						as: "userdata"
					}
				},
				{
					$lookup: {
						from: "story",
						localField: "story",
						foreignField: "_id",
						as: "storydata"
					}
				},
				{
					$lookup: {
						from: "account",
						localField: "account",
						foreignField: "_id",
						as: "accountdata"
					}
				},
				{
					$match: matchcriteria
				},
				{
					$count: "potentialcount"
				}
			],
			function (err, result) {

				if (err) {
					return res.serverError(err);
				}
				sails.log.info("potentialcount result: ", result);

				if (result.length > 0) {
					totalrecords = result[0].potentialcount;

					PaymentManagement.native(function (err, collection) {

						collection.aggregate(
							[
								{
									$lookup: {
										from: "user",
										localField: "user",
										foreignField: "_id",
										as: "userdata"
									}
								},
								{
									$lookup: {
										from: "story",
										localField: "story",
										foreignField: "_id",
										as: "storydata"
									}
								},
								{
									$lookup: {
										from: "account",
										localField: "account",
										foreignField: "_id",
										as: "accountdata"
									}
								},
								{
									$match: matchcriteria
								},
								{
									$sort: sorttypevalue
								},
								{
									$skip: skiprecord
								},
								{
									$limit: iDisplayLength
								}
							],
							function (err, result) {
								if (err) {
									return res.serverError(err);
								}

								if (result.length > 0) {
									potentialDetails = result;
									potentialDetails.forEach(function (potentialinfo, loopvalue) {

										var payuserName = '';
										var payuserscreenName = '';
										var payuserEmail = '';
										var payuserphoneNumber = '';
										var userReference = '--';
										var storyReference = '--';
										var payuserNameLink = '--';
										var availableBalance = 0;
										var creditScore = 0;
										var userblocked = 0;
										var payuserLink = '--';

										loopid = loopvalue + skiprecord + 1;

										var userinfo = potentialinfo.userdata[0];
										var storyinfo = potentialinfo.storydata[0];
										var accountinfo = potentialinfo.accountdata[0];

										if ("undefined" !== typeof userinfo.userReference && userinfo.userReference != '' && userinfo.userReference != null) {
											var userReference = userinfo.userReference;
										}

										if ("undefined" !== typeof userinfo.firstname && userinfo.firstname != '' && userinfo.firstname != null) {
											var payuserName = userinfo.firstname + ' ' + userinfo.lastname;
										}

										if ("undefined" !== typeof userinfo.email && userinfo.email != '' && userinfo.email != null) {
											var payuserEmail = userinfo.email;
										}

										if ("undefined" !== typeof userinfo.phoneNumber && userinfo.phoneNumber != '' && userinfo.phoneNumber != null) {
											var payuserphoneNumber = userinfo.phoneNumber;
										}

										if ("undefined" !== typeof storyinfo.storyReference && storyinfo.storyReference != '' && storyinfo.storyReference != null) {
											var storyReference = storyinfo.storyReference;
										}



										potentialinfo.createdAt = moment(potentialinfo.createdAt).tz("America/los_angeles").format('MM-DD-YYYY hh:mm:ss');
										potentialinfo.maturityDate = moment(potentialinfo.maturityDate).format('MM-DD-YYYY');

										systemUniqueKeyURL = 'getAchUserDetails/' + potentialinfo._id;
										systemUserUniqueKeyURL = 'viewUserDetails/' + userinfo._id;

										if (potentialinfo.loanReference != '' && potentialinfo.loanReference != null) {
											var payloanReference = '<a href=\'' + systemUniqueKeyURL + '\'>' + potentialinfo.loanReference + '</a>';
										}
										else {
											var payloanReference = '--';
										}

										if ("undefined" !== typeof userinfo.userReference && userinfo.userReference != '' && userinfo.userReference != null) {
											var payuserLink = '<a href=\'' + systemUserUniqueKeyURL + '\'>' + userinfo.userReference + '</a>';
										}

										if (potentialinfo.achstatus == 0) {
											var statusicon = '<i class=\'fa fa-circle text-warning\' aria-hidden=\'true\' ></i> Pending';
										}
										else if (potentialinfo.achstatus == 1) {
											var statusicon = '<i class=\'fa fa-circle text-success\' aria-hidden=\'true\' ></i> Funded';
										}
										else if (potentialinfo.achstatus == 2) {
											if (potentialinfo.deniedfromapp == 1) {
												var statusicon = '<i class=\'fa fa-circle text-danger\' aria-hidden=\'true\' ></i> Denied (from app)';
											}
											else {
												var statusicon = '<i class=\'fa fa-circle text-danger\' aria-hidden=\'true\' ></i> Denied';
											}
										}

										if ("undefined" !== typeof userinfo.email && userinfo.email != '' && userinfo.email != null) {
											var emillnk = '<a href="mailto:' + userinfo.email + '">' + userinfo.email.replace(/(.{10})/g, "$1<br>") + '</a>';
										}

										setcurrent = 0;
										_.forEach(potentialinfo.paymentSchedule, function (payDetails) {

											var todaysDate = moment().startOf('day').toDate().getTime();
											var scheduleDate = moment(payDetails.date).add(1, 'days').startOf('day').toDate().getTime();

											if (setcurrent == 0) {
												if (scheduleDate < todaysDate && payDetails.status == 'OPENED') {
													potentialinfo.status = "Late";
													setcurrent = 1;
												}
												else if (potentialinfo.status == "OPENED" || potentialinfo.status == "CURRENT") {
													potentialinfo.status = "Current";
												}
											}
										});

										if (accountinfo) {
											if (accountinfo.balance) {
												var availableBalance = accountinfo.balance.available;
											}
										}



										potentialData.push({ loopid: loopid, loanReference: payloanReference, storyReference: storyReference, userReference: payuserLink, name: payuserName, email: payuserEmail, phoneNumber: payuserphoneNumber, payOffAmount: potentialinfo.payOffAmount, availableBalance: availableBalance, maturityDate: potentialinfo.maturityDate, createdAt: potentialinfo.createdAt, status: statusicon, paymentstatus: potentialinfo.status });

									});

									var json = {
										sEcho: req.query.sEcho,
										iTotalRecords: totalrecords,
										iTotalDisplayRecords: totalrecords,
										aaData: potentialData
									};
									res.contentType('application/json');
									res.json(json);
								}
								else {
									var json = {
										sEcho: req.query.sEcho,
										iTotalRecords: totalrecords,
										iTotalDisplayRecords: totalrecords,
										aaData: potentialData
									};
									res.contentType('application/json');
									res.json(json);
								}
							})
					});

					/*var json = {
						sEcho:req.query.sEcho,
						iTotalRecords: totalrecords,
						iTotalDisplayRecords: totalrecords,
						aaData: potentialData
					};
					res.contentType('application/json');
					res.json(json);*/
				}
				else {
					var json = {
						sEcho: req.query.sEcho,
						iTotalRecords: totalrecords,
						iTotalDisplayRecords: totalrecords,
						aaData: potentialData
					};
					res.contentType('application/json');
					res.json(json);
				}
			})
	});
}

//-- Approve patient pending loan from admin to funded
function approvePatientloanAction(req, res) {
	var payID = req.param('paymentID');
	var loanstartdate = req.param('loanstartdate');
	var allParams = req.allParams();
	if (payID) {
		var payoptions = { id: payID, achstatus: 0 };

		PaymentManagement.findOne(payoptions)
			.populate('user')
			.populate('account')
			.then(function (paymentmanagementdata) {

				if (paymentmanagementdata) {
					//-- Loan set date
					var allowApproveOption = 0;
					var loanSetDateExist = 0;

					if (paymentmanagementdata.loanSetdate) {
						var loanSetDateExist = 1;
						if (moment().startOf('day').toDate().getTime() == moment(paymentmanagementdata.loanSetdate).startOf('day').toDate().getTime()) {
							allowApproveOption = 1;
						}
					}


					if (!paymentmanagementdata.blockachcredit) {
						paymentmanagementdata.blockachcredit = 0;
					}

					/*if(allowApproveOption==0)
					{
						req.session.approveerror='';
						if(loanSetDateExist==1)
						{
							req.session.approveerror = 'Error: Application set date and today date differ!';
						}
						else
						{
							req.session.approveerror = 'Error: Application set date is not set!';
						}
						return res.redirect("admin/getAchDetails");
					}
					else
					{*/

					//remove me after test
					paymentmanagementdata.blockachcredit = 0;

					if (paymentmanagementdata.blockachcredit == 1) {
						if (paymentmanagementdata.account == null) {
							req.session.approveerror = `Could not set procedure date. Possibly missing bank account information. Please call ${sails.config.lender.shortName} for assistance at ${sails.config.lender.phone}`;
						}
						else {
							req.session.approveerror = 'Could not set proceedure date. Applicant may already have an existing loan';
						}
						return res.redirect("admin/getOpenApplicationDetails");
					}
					else {

						PaymentManagement.update({ id: payID }, { blockachcredit: 1 })
							.exec(function afterwards(err, paymentupdated) {

								ActumService.createActumCreditFile(paymentmanagementdata, req, res)
									.then(function (responseData) {

										//sails.log.info("responseData:",responseData);
										if (responseData.code == 200) {
											var creditfilepath = responseData.creditfilepath;

											PaymentManagement.findOne(payoptions)
												.then(function (paymentManagement) {

													var nextPaymentSchedule = '';
													var maturityDate = '';
													var counter = 1;
													var datecounter = 0;
													_.forEach(paymentManagement.paymentSchedule, function (schedule) {
														var paydate = moment(loanstartdate).startOf('day').add(counter, 'months').toDate();
														var lastpaydate = moment(loanstartdate).startOf('day').add(datecounter, 'months').toDate();

														//schedule.transaction = transactionDetails.TransactionId;
														schedule.date = paydate;
														schedule.lastpaiddate = lastpaydate;

														if (counter == 1) {
															nextPaymentSchedule = paydate;
														}
														maturityDate = paydate;

														counter++;
														datecounter++;
													});

													var loanTerm = paymentManagement.loantermcount
													var maturityDate = moment(loanstartdate).startOf('day').add(loanTerm, 'months');

													paymentManagement.achstatus = 1;
													paymentManagement.transferstatus = 1;
													//paymentManagement.transfertransactionid =transactionDetails.TransactionId;
													paymentManagement.nextPaymentSchedule = nextPaymentSchedule;
													paymentManagement.maturityDate = maturityDate;
													paymentManagement.localcreditfilepath = creditfilepath;

													paymentManagement.loanStartdate = moment(loanstartdate).format('YYYY-MM-DD');
													paymentManagement.loanApprovedDate = moment().startOf('day').format('YYYY-MM-DD');
													paymentmanagementdata.appverified = 1;
													paymentManagement.status = "OPENED";

													//sails.log.info("paymentManagement:",paymentManagement);

													paymentManagement.save(function (err) {
														if (err) {
															sails.log.error('AchController#approvePatientloanAction :: err', err);
															req.session.approveerror = '';
															req.session.approveerror = 'Unable to approve the loan. Try again!';
															return res.redirect("admin/getOpenApplicationDetails");
														}

														ApplicationService
															.reGeneratepromissorypdf(paymentManagement.id, paymentManagement.user, req, res)
															.then(function (generatedResponse) {

																if (generatedResponse) {

																	//-- Genreating shorter version of promissory pdf
																	UserConsent.reGenerateLendingDisclosureAgreement(paymentManagement.id, res, req)
																		.then(function (lendingreponse) {
																			PracticeManagement.findOne({ id: paymentmanagementdata.practicemanagement })
																				.then((practiceData) => {
																					var loanData = {
																						'loanReference': paymentmanagementdata.loanReference,
																						'email': paymentmanagementdata.user.email,
																						'firstname': paymentmanagementdata.user.firstname,
																						'lastname': paymentmanagementdata.user.lastname,
																						'comprehensiveData': paymentmanagementdata,
																						'practiceName': practiceData ? practiceData.PracticeName : ""
																					};

																					sails.log.info("loanData:", loanData);

																					EmailService.sendFundedLoanMail(loanData);


																					var modulename = 'Loan Approved';
																					var modulemessage = 'Pending application moved to Approved successfully';
																					req.achlog = 1;
																					req.payID = payID;
																					Logactivity.registerLogActivity(req, modulename, modulemessage);

																					req.session.successmsg = 'Loan has been approved successfully';
																					return res.redirect("admin/getOpenApplicationDetails");
																					// FirstAssociatesService.processAndUploadFirstAssociatesLoanDocument(paymentManagement.id).then((results) => {
																					// 	return res.redirect("admin/getOpenApplicationDetails");
																					// }).catch((errorObj) => {
																					// 	sails.log.error("AchController#confirmProcedureAction :: first associates csv err", errorObj);
																					// 	return res.redirect("admin/getOpenApplicationDetails");
																					// });
																				});
																		})
																		.catch(function (err) {
																			req.session.approveerror = 'Unable to approve the loan. Try again!';

																			req.session.successmsg = '';
																			sails.log.error('AchController#getAchUserDetailsAction :: err', err);
																			return res.redirect("admin/getOpenApplicationDetails");
																		});
																}
																else {
																	req.session.approveerror = '';
																	req.session.approveerror = 'Unable to approve the loan. Try again!';
																	sails.log.error('AchController#getAchUserDetailsAction :: err', err);
																	return res.redirect("admin/getOpenApplicationDetails");
																}
															}).catch(function (err) {
																sails.log.error('AchController#approvePatientloanAction :: err', err);
																req.session.approveerror = '';
																req.session.approveerror = 'Unable to approve the loan. Try again!';
																return res.redirect("admin/getOpenApplicationDetails");
															});
													});
												})
												.catch(function (err) {
													sails.log.error('AchController#approvePatientloanAction :: err', err);
													req.session.approveerror = '';
													req.session.approveerror = 'Unable to approve the loan. Try again!';
													return res.redirect("admin/getOpenApplicationDetails");
												});
										}
										else {
											var failedcreditcount = 1;
											if (paymentmanagementdata.failedcreditcount) {
												var failedcreditcount = parseInt(paymentmanagementdata.failedcreditcount) + 1;
											}
											PaymentManagement.update({ id: payID }, { blockachcredit: 0, failedcreditcount: failedcreditcount })
												.exec(function afterwards(err, userupdated) {
													sails.log.error('AchController#approvePatientloanAction :: err', responseData.responseMsg);
													req.session.approveerror = '';
													req.session.approveerror = 'Unable to approve the loan. Try again!';
													return res.redirect("admin/getOpenApplicationDetails");
												});
										}
									})
									.catch(function (err) {
										sails.log.error('AchController#approvePatientloanAction :: err', err);
										req.session.approveerror = '';
										req.session.approveerror = 'Unable to approve the loan. Try again!';
										return res.redirect("admin/getOpenApplicationDetails");
									});
							});
					}
					/*}*/
				}
				else {
					sails.log.error('AchController#approvePatientloanAction :: missing paymentmanagement');
					req.session.approveerror = '';
					req.session.approveerror = 'Unable to Approve the loan. Try again!';
					return res.redirect("admin/getOpenApplicationDetails");
				}

			}).catch(function (err) {
				sails.log.error('AchController#approvePatientloanAction :: err', err);
				req.session.approveerror = '';
				req.session.approveerror = 'Unable to Approve the loan. Try again!';
				return res.redirect("admin/getOpenApplicationDetails");
			});
	}
	else {
		sails.log.error('AchController#approvePatientloanAction :: missing paymentID');
		req.session.approveerror = '';
		req.session.approveerror = 'Unable to Approve the loan. Try again!';
		return res.redirect("admin/getOpenApplicationDetails");
	}
}

function updateSetDateAction(req, res) {

	var payID = req.param('paymentID');
	var loanSetdate = req.param('loanSetdate');

	if (payID) {
		var payoptions = { id: payID };

		PaymentManagement
			.findOne(payoptions)
			.then(function (paymentmanagementdata) {

				if (paymentmanagementdata) {
					paymentmanagementdata.loanSetdate = moment(loanSetdate).format('YYYY-MM-DD');
					paymentmanagementdata.appverified = 1;
					paymentmanagementdata.save(function (err) {
						if (err) {
							var json = {
								status: 400,
								message: `Unable to update set date ${err}`
							};
							res.contentType('application/json');
							res.json(json);
						}
						else {

							var modulename = 'Set Date Update';
							var modulemessage = 'Set Date Update in Pending Applications successfully.';
							req.achlog = 1;
							req.payID = payID;
							//req.logdata=paymentmanagementdata;
							Logactivity.registerLogActivity(req, modulename, modulemessage);
							//-- Loan set date
							var loanSetDateExist = 0;
							var showApproveButton = 0;

							if (paymentmanagementdata.loanSetdate) {
								loanSetDateExist = 1;

								if (moment().startOf('day').toDate().getTime() == moment(paymentmanagementdata.loanSetdate).startOf('day').toDate().getTime()) {
									showApproveButton = 1;
								}
							}

							var json = {
								status: 200,
								message: 'Set date updated successfully',
								loanSetDateExist: loanSetDateExist,
								showApproveButton: showApproveButton
							};
							res.contentType('application/json');
							res.json(json);
						}
					});
				}
				else {
					var json = {
						status: 400,
						message: 'Invalid payment details'
					};
					res.contentType('application/json');
					res.json(json);
				}
			}).catch(function (err) {
				var json = {
					status: 400,
					message: 'Unable to fetch payment details'
				};
				res.contentType('application/json');
				res.json(json);
			});
	}
	else {
		var json = {
			status: 400,
			message: 'Unable to update set date'
		};
		res.contentType('application/json');
		res.json(json);
	}
}

function updatePreferredDateAction(req, res) {
	var screentrackingId = req.param('screentrackingId');
	var preferredDueDate = req.param('preferredDueDate');
	if (screentrackingId) {

		Screentracking
			.findOne({ id: screentrackingId })
			.then(function (screentracking) {
				if (screentracking) {
					screentracking.preferredDueDate = preferredDueDate;
					screentracking.save(function (err) {
						if (err) {
							var json = {
								status: 400,
								message: `Unable to update set date ${err}`
							};
							res.contentType('application/json');
							res.json(json);
						}
						else {
							var json = {
								status: 200,
								message: 'Set preferred date updated successfully',
								updated: true
							};
							res.contentType('application/json');
							res.json(json);
						}
					});
				}
				else {
					var json = {
						status: 400,
						message: 'Invalid screentracking details'
					};
					res.contentType('application/json');
					res.json(json);
				}
			}).catch(function (err) {
				var json = {
					status: 400,
					message: 'Unable to fetch screentracking details'
				};
				res.contentType('application/json');
				res.json(json);
			});
	}
	else {
		var json = {
			status: 400,
			message: 'Unable to update set date'
		};
		res.contentType('application/json');
		res.json(json);
	}
}

function updatePatientloanstartdateAction(req, res) {
	var payID = req.param('paymentID');
	var loanstartdate = req.param('updateloanstartdate');
	var allParams = req.allParams();
	if (payID) {
		var payoptions = { id: payID, achstatus: 1 };
		PaymentManagement.findOne(payoptions)
			.populate('user')
			.populate('account')
			.then(function (paymentmanagementdata) {
				if (paymentmanagementdata) {
					PaymentManagement
						.findOne(payoptions)
						.then(function (paymentManagement) {
							var existingstartDatetime = moment(paymentManagement.loanStartdate).startOf('day').toDate().getTime();
							var loanstartdatetime = moment(loanstartdate).startOf('day').toDate().getTime();
/*					sails.log.info("existingstartDatetime:",existingstartDatetime);
					sails.log.info("loanstartdatetime:",loanstartdatetime);
*/					if (existingstartDatetime == loanstartdatetime) {
								req.session.successmsg = '';
								req.session.successmsg = 'Application procedure date updated successfully.';
								return res.redirect("admin/showAllComplete");
							}
							else {
								var nextPaymentSchedule = '';
								var maturityDate = '';
								var counter = 1;
								var datecounter = 0;
								_.forEach(paymentManagement.paymentSchedule, function (schedule) {
									var paydate = moment(loanstartdate).startOf('day').add(counter, 'months').toDate();
									var lastpaydate = moment(loanstartdate).startOf('day').add(datecounter, 'months').toDate();
									schedule.date = paydate;
									schedule.lastpaiddate = lastpaydate;

									if (counter == 1) {
										nextPaymentSchedule = paydate;
									}
									maturityDate = paydate;

									counter++;
									datecounter++;
								});

								var loanTerm = paymentManagement.loantermcount
								var maturityDate = moment(loanstartdate).startOf('day').add(loanTerm, 'months');

								paymentManagement.achstatus = 1;
								paymentManagement.transferstatus = 1;
								paymentManagement.nextPaymentSchedule = nextPaymentSchedule;
								paymentManagement.maturityDate = maturityDate;
								paymentManagement.loanStartdate = moment(loanstartdate).format('YYYY-MM-DD');
								paymentManagement.loanSetdate = moment(loanstartdate).format('YYYY-MM-DD');
								paymentManagement.loanApprovedDate = moment().startOf('day').format('YYYY-MM-DD');

								paymentManagement.save(function (err) {
									if (err) {
										req.session.approveerror = '';
										req.session.approveerror = 'Unable to set the procedure date. Try again!';
										return res.redirect("admin/showAllComplete");
									}
									ApplicationService
										.reGeneratepromissorypdf(paymentManagement.id, paymentManagement.user, req, res)
										.then(function (generatedResponse) {
											if (generatedResponse) {
												UserConsent
													.reGenerateLendingDisclosureAgreement(paymentManagement.id, res, req)
													.then(function (lendingreponse) {
														var loanData = {
															'loanReference': paymentmanagementdata.loanReference,
															'email': paymentmanagementdata.user.email,
															'firstname': paymentmanagementdata.user.firstname,
															'lastname': paymentmanagementdata.user.lastname
														};

														sails.log.info("loanData:", loanData);

														var modulename = 'Update procedure start date from funded';
														var modulemessage = 'Update procedure start date updated successfully';
														req.achlog = 1;
														req.payID = payID;
														Logactivity.registerLogActivity(req, modulename, modulemessage);

														req.session.successmsg = '';
														req.session.successmsg = 'Application procedure date updated successfully.';
														return res.redirect("admin/showAllComplete");
													})
													.catch(function (err) {
														req.session.approveerror = '';
														req.session.approveerror = 'Unable to set the procedure date. Try again!';
														sails.log.error('AchController#updatePatientloanstartdateAction :: err', err);
														return res.redirect("admin/showAllComplete");
													});
											}
										}).catch(function (err) {
											sails.log.error('AchController#updatePatientloanstartdateAction :: err', err);
											req.session.approveerror = '';
											req.session.approveerror = 'Unable to procedure date. Try again!';
											return res.redirect("admin/showAllComplete");
										});
								});
							}
						}).catch(function (err) {
							req.session.approveerror = '';
							req.session.approveerror = 'Unable to set the procedure date. Try again. Try again!';
							return res.redirect("admin/showAllComplete");
						});
				}
				else {
					req.session.approveerror = '';
					req.session.approveerror = 'Unable to set the procedure date. Try again!';
					return res.redirect("admin/showAllComplete");
				}
			}).catch(function (err) {
				req.session.approveerror = '';
				req.session.approveerror = 'Unable to set the procedure date. Try again!';
				return res.redirect("admin/showAllComplete");
			});
	}
	else {
		req.session.approveerror = '';
		req.session.approveerror = 'Unable to set the procedure date. Try again!';
		return res.redirect("admin/showAllComplete");
	}
}
function linkdoctorstaffAction(req, res) {
	var practicestaff = req.param('practicestaff');
	var practicedoctor = req.param('practicedoctor');

	var paymentID = req.param('paymentID');
	var payoptions = { id: paymentID, achstatus: [0, 1, 4] };
	PaymentManagement.findOne(payoptions)
		.then(function (paymentmanagementdata) {
			paymentmanagementdata.linkeddoctor = practicedoctor;
			paymentmanagementdata.linkedstaff = practicestaff;
			paymentmanagementdata.save(function (err) {
				if (err) {
					var json = {
						status: 400,
						message: 'Something went wrong. please try again.'
					};
					res.contentType('application/json');
					res.json(json);
				}

				var practcriteria = { practicemanagement: paymentmanagementdata.practicemanagement };
				PracticeUser
					.find(practcriteria)
					.then(function (practiceResults) {
						if (practiceResults) {
							var practiceDocResults = [];
							var practiceAllResults = [];
							var practiceids = [];
							var linkedstaffArr = [];
							var linkedDoctorArr = [];
							if (paymentmanagementdata.linkedstaff) {
								linkedstaffArr = paymentmanagementdata.linkedstaff;
							}
							if (paymentmanagementdata.linkeddoctor) {
								linkedDoctorArr = paymentmanagementdata.linkeddoctor;
							}
							_.forEach(practiceResults, function (practice) {
								var staffexist = 0;
								var doctorexist = 0;
								if (linkedstaffArr.length > 0) {
									if (in_array(practice.id, linkedstaffArr)) {
										staffexist = 1;
									}
								}
								if (linkedDoctorArr.length > 0) {
									if (in_array(practice.id, linkedDoctorArr)) {
										doctorexist = 1;
									}
								}
								var practiceinfo = {
									id: practice.id,
									fullname: practice.firstname + ' ' + practice.lastname,
									staffexist: staffexist,
									doctorexist: doctorexist
								}
								if (practice.role == 'PracticeDoctor') {
									practiceDocResults.push(practiceinfo);
								}
								practiceAllResults.push(practiceinfo);
							});

							PracticeUser
								.getPracticeDetails(linkedstaffArr, linkedDoctorArr)
								.then(function (linkedpracticeRes) {
									var linkedpractices = [];
									if (linkedpracticeRes.code == 200) {
										var linkedpractices = linkedpracticeRes.result;
									}
									res.render("admin/pendingach/doctorsStafflist", { linkedpractices: linkedpractices }, function (err, listdata) {
										var json = {
											status: 200,
											message: 'Updated successfully.',
											listdata: listdata
										};
										res.contentType('application/json');
										res.json(json);
									});
								}).catch(function (err) {
									var json = {
										status: 400,
										message: 'Something went wrong. please try again.'
									};
									res.contentType('application/json');
									res.json(json);
								});
						}
						else {
							var json = {
								status: 200,
								message: 'Updated successfully.',
								listdata: ""
							};
							res.contentType('application/json');
							res.json(json);
						}
					});
			});
		}).catch(function (err) {
			var json = {
				status: 400,
				message: 'Something went wrong. please try again.'
			};
			res.contentType('application/json');
			res.json(json);
		})
}
function movetoopenupdateAction(req, res) {
	var paymentID = req.param('paymentID');
	var payCriteria = { id: paymentID };

	PaymentManagement.findOne(payCriteria)
		.then(function (paymentmanagementdata) {

			paymentmanagementdata.moveToOpen = 1;
			paymentmanagementdata.save(function (err) {
				if (err) {
					var json = {
						status: 400,
						message: "Unable to Update Pending loan. Try again!"
					};
					res.contentType('application/json');
					res.json(json);
				} else {
					Screentracking.findOne({ id: paymentmanagementdata.screentracking })
						.then(function (screenData) {
							screenData.moveToIncomplete = 1;
							screenData.save(function (err1) {
								if (err1) {
									var json = {
										status: 400,
										message: "Unable to Update Pending loan. Try again!"
									};
									res.contentType('application/json');
									res.json(json);
								}
								else {
									var modulename = 'Application moved from archive to open.';
									var modulemessage = 'Application moved from archive to open.';
									req.achlog = 1;
									req.payID = paymentID;
									//req.logdata=paymentmanagementdata;
									Logactivity.registerLogActivity(req, modulename, modulemessage);
									var json = {
										status: 200,
										message: 'Application moved to open successfully.'
									};
									res.contentType('application/json');
									res.json(json);
								}
							});
						});
				}
			})
		})
}

function markAsReviewedAction(req, res) {
	var paymentID = req.param('paymentID');
	var payCriteria = { id: paymentID };

	PaymentManagement.findOne(payCriteria)
		.then(function (paymentmanagementdata) {

			paymentmanagementdata.appverified = 1;
			paymentmanagementdata.save(function (err) {
				if (err) {
					var json = {
						status: 400,
						message: "Unable to Update Denied loan. Try again!"
					};
					res.contentType('application/json');
					res.json(json);
				}
				else {
					var modulename = 'Mark As Reviewed';
					var modulemessage = 'Denied applications marked as reviewed successfully.';
					req.achlog = 1;
					req.payID = paymentID;
					//req.logdata=paymentmanagementdata;
					Logactivity.registerLogActivity(req, modulename, modulemessage);
					var json = {
						status: 200,
						message: 'Application marked as complete successfully.'
					};
					res.contentType('application/json');
					res.json(json);
				}
			})
		})
}
function ajaxOpenApplicationAchAction(req, res) {
	let iDisplayLengthvalue = 0;
	let skiprecord = 0;
	let totalrecords = 0;
	let viewtype = "open";
	let screenResdata = [];
	let matchcriteria = {};
	let whereConditionOr = new Array();
	if ("undefined" !== req.param("viewtype") && req.param("viewtype") != '' && req.param("viewtype") != null) {
		viewtype = req.param("viewtype");
	}
	if (viewtype == 'open') {
		payFilterData = [{ paymentdata: { $ne: [] }, iscompleted: 1, "paymentdata.achstatus": 0 }];
	} else if (viewtype == 'openPending') {
		payFilterData = [{
			$and: [
				{ iscompleted: 1 },
				{ paymentdata: { $ne: [] } },
				{ "paymentdata.achstatus": 0 },
				{ moveToArchive: { $ne: 1 } }
			]
		}];
	} else if (viewtype === "openIncomplete") {
		payFilterData = [{
			$and: [
				{ $or: [{ paymentdata: { $eq: [] }, iscompleted: 0 }, { paymentdata: { $ne: [] }, "paymentdata.achstatus": 4 }] },
				{ $or: [{ blockedList: { $eq: false, $exists: true } }, { blockedList: { $exists: false } }] },
				{ moveToArchive: { $ne: 1 } }
			]
		}];
	} else if (viewtype == 'archived') {
		payFilterData = [{ paymentdata: { $eq: [] }, iscompleted: 0 }, { paymentdata: { $ne: [] }, iscompleted: 1, "paymentdata.achstatus": 0 }, { paymentdata: { $ne: [] }, "paymentdata.achstatus": 2 }, { paymentdata: { $ne: [] }, "paymentdata.moveToArchive": 1 }];
	} else if (viewtype == 'toDoItems') {
		payFilterData = [{ paymentdata: { $eq: [] }, iscompleted: 0 }, { paymentdata: { $ne: [] }, iscompleted: 1, "paymentdata.achstatus": 0 }];
	} else {
		payFilterData = [{ paymentdata: { $eq: [] }, iscompleted: 0 }, { paymentdata: { $ne: [] }, iscompleted: 1, "paymentdata.achstatus": 0 }];
	}
	let andCriteria = [
		{ userdata: { $ne: [] } },
		{ $or: payFilterData }
	]
	if (req.query.sSearch) {
		whereConditionOr.push({ "applicationReference": { '$regex': req.query.sSearch, $options: 'i' } });
		whereConditionOr.push({ "paymentdata.loanReference": { '$regex': req.query.sSearch, $options: 'i' } });
		whereConditionOr.push({ "userdata.firstname": { '$regex': req.query.sSearch, $options: 'i' } });
		whereConditionOr.push({ "userdata.lastname": { '$regex': req.query.sSearch, $options: 'i' } });
		whereConditionOr.push({ "userdata.email": { '$regex': req.query.sSearch, $options: 'i' } });
		whereConditionOr.push({ "userdata.phoneNumber": { '$regex': req.query.sSearch, $options: 'i' } });
		whereConditionOr.push({ "creditscore": { '$regex': req.query.sSearch, $options: 'i' } });
		whereConditionOr.push({ "lastScreenName": { '$regex': req.query.sSearch, $options: 'i' } });
		whereConditionOr.push({ "userdata.registeredtype": { '$regex': req.query.sSearch, $options: 'i' } });
		whereConditionOr.push({ "userdata.underwriter": { '$regex': req.query.sSearch, $options: 'i' } });
		//-- for search filter for application type
		var searchstring = req.query.sSearch;
		if (searchstring.toLowerCase() == 'pending') {
			whereConditionOr.push({ "paymentdata.achstatus": 0 });
		}
		if (searchstring.toLowerCase() == 'denied') {
			whereConditionOr.push({ "paymentdata.achstatus": 2 });
		}
		if (searchstring.toLowerCase() == 'incomplete') {
			whereConditionOr.push({ "iscompleted": 0 });
		}
		andCriteria.push({ $or: whereConditionOr });
	}
	if (viewtype == 'archived') {
		andCriteria.push({ moveToArchive: 1 });
	}
	matchcriteria = { $and: andCriteria }
	if ("undefined" !== typeof req.session.adminpracticeID && req.session.adminpracticeID != '' && req.session.adminpracticeID != null) {
		matchcriteria.practicemanagement = new ObjectId(req.session.adminpracticeID);
	}
	Screentracking.native(function (err, collection) {
		collection.aggregate([
			{
				$match: {
					createdAt: { $gte: moment().subtract('4', 'months').toDate() }
				}
			},
			{
				$lookup: {
					from: "user",
					localField: "user",
					foreignField: "_id",
					as: "userdata"
				}
			},
			{
				$lookup: {
					from: "paymentmanagement",
					localField: "_id",
					foreignField: "screentracking",
					as: "paymentdata"
				}
			},
			{
				$lookup: {
					from: "practicemanagement",
					localField: "practicemanagement",
					foreignField: "_id",
					as: "practicedata"
				}
			},
			// {
			// 	"$addFields": {
			// 		toDoEmailList:
			// 		{
			// 			$cond: { if: { $eq: [ "$userdata.isEmailVerified", true] }, then: 1, else: 0 }
			// 		},
			// 		toDoBankList:
			// 		{
			// 			$cond: { if: { $eq: [ "$userdata.isBankAdded", true] }, then: 1, else: 0 }
			// 		},
			// 		toDoGovernList:
			// 		{
			// 			$cond: { if: { $eq: [ "$userdata.isGovernmentIssued", true] }, then: 1, else: 0 }
			// 		},
			// 		toDoPayrollList:
			// 		{
			// 			$cond: { if: { $eq: [ "$userdata.isPayroll", true] }, then: 1, else: 0 }
			// 		},
			// 		toDolist:
			// 		{
			// 			$add: [
			// 				{$cond: { if: { $eq: [ "$userdata.isEmailVerified", true] }, then: 1, else: 0 }},
			// 				{$cond: { if: { $eq: [ "$userdata.isBankAdded", true] }, then: 1, else: 0 }},
			// 				{$cond: { if: { $eq: [ "$userdata.isGovernmentIssued", true] }, then: 1, else: 0 }},
			// 				{$cond: { if: { $eq: [ "$userdata.isPayroll", true] }, then: 1, else: 0 }}
			// 			]
			// 		}
			// 	}
			// },
			{
				$match: matchcriteria
			},
			// {
			// 	$count: "screentrackingcount"
			// }
		], function (err, screenDetails) {
			if (err) {
				return res.serverError(err);
			}
			iDisplayLengthvalue = parseInt(req.query.iDisplayLength);
			skiprecord = parseInt(req.query.iDisplayStart);
			if (typeof screenDetails === "undefined" || screenDetails.length == 0) {
				var json = {
					sEcho: req.query.sEcho,
					iTotalRecords: totalrecords,
					iTotalDisplayRecords: totalrecords,
					aaData: screenResdata
				};
				res.contentType('application/json');
				return res.json(json);
			}

			totalrecords = screenDetails.length;

			screenDetails = Screentracking.getFundingTierFromScreenTrackingList(screenDetails);
			screenDetails = sortDataTables(viewtype, screenDetails, req.query.sSortDir_0, req.query.iSortCol_0);

			var arraylength = iDisplayLengthvalue + skiprecord;
			screenDetails = screenDetails.slice(skiprecord, arraylength);

			screenDetails.forEach(function (screentrackingdata, loopvalue) {
				let loopid = loopvalue + skiprecord + 1;
				let appReference = '--';
				let loanReference = '--';
				let fullname = "--";
				let useremail = "--";
				let userphoneNumber = "--";
				let userregisteredtype = "--";
				let practicename = '--';
				let fundingTier = '--';
				let creditScore = "--";
				let apr = '--';
				let payOffAmountValue = '--';
				let systemUniqueKeyURL;
				let applicationType = 'Incomplete';
				let promissoryNoteSign = "No";
				let userinfo = screentrackingdata.userdata[0];
				let paymentdetails = []; // screentrackingdata.paymentdata;
				let practicedetails = screentrackingdata.practicedata[0];

				screentrackingdata.createdAt = moment(screentrackingdata.createdAt).format('MM-DD-YYYY');
				screentrackingdata.updatedAt = moment(screentrackingdata.updatedAt).format('MM-DD-YYYY');
				// practicename
				if (practicedetails) {
					if (practicedetails.PracticeName) {
						practicename = practicedetails.PracticeName;
					}
				}
				if (screentrackingdata.fundingTier) {
					fundingTier = screentrackingdata.fundingTier;
				}
				if ("undefined" !== typeof userinfo.firstname && userinfo.firstname != '' && userinfo.firstname != null) {
					fullname = userinfo.firstname + ' ' + userinfo.lastname;
				}
				if ("undefined" !== typeof userinfo.email && userinfo.email != '' && userinfo.email != null) {
					useremail = userinfo.email;
				}
				if ("undefined" !== typeof userinfo.phoneNumber && userinfo.phoneNumber != '' && userinfo.phoneNumber != null) {
					userphoneNumber = userinfo.phoneNumber.replace(/[^\d]/g, "");
					userphoneNumber = userphoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
				}
				if ("undefined" !== typeof userinfo.registeredtype && userinfo.registeredtype != '' && userinfo.registeredtype != null) {
					userregisteredtype = userinfo.registeredtype;
				}
				if (screentrackingdata.applicationReference) {
					appReference = ' <a href="/admin/viewIncomplete/' + screentrackingdata._id + '">' + screentrackingdata.applicationReference + '</a>';
				}
				if (screentrackingdata.creditscore) {
					creditScore = screentrackingdata.creditscore;
				}
				if (screentrackingdata.offerdata && screentrackingdata.offerdata.length > 0) {
					if (screentrackingdata.offerdata[0] && screentrackingdata.offerdata[0].length > 0) {
						payOffAmountValue = parseFloat(screentrackingdata.financedAmount);
						apr = parseFloat(screentrackingdata.apr);
					} else if (screentrackingdata.requestedLoanAmount) {
						payOffAmountValue = parseFloat(screentrackingdata.requestedLoanAmount);
					}
				}
				if (paymentdetails.length > 0) {
					let paydata = paymentdetails[0];
					promissoryNoteSign = "Yes";
					if (paydata.achstatus == 0) {
						applicationType = 'Pending';
					} else if (paydata.achstatus == 1) {
						applicationType = 'Approved';
					} else if (paydata.achstatus == 2) {
						applicationType = 'Denied';
					} else if (paydata.achstatus == 3) {
						applicationType = 'Blocked';
					}
					if (screentrackingdata.applicationReference) {
						appReference = screentrackingdata.applicationReference;
					}
					if (paydata.loanReference != '' && paydata.loanReference != null && "undefined" !== typeof paydata.loanReference) {
						systemUniqueKeyURL = 'getAchUserDetails/' + paydata._id;
						loanReference = '<a href=\'' + systemUniqueKeyURL + '\'>' + paydata.loanReference + '</a>';
					}
					if (paydata.payOffAmount || paydata.payOffAmount == 0) {
						payOffAmountValue = "$" + parseFloat(paydata.payOffAmount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
					}
					if (paydata.hasOwnProperty("apr")) {
						apr = parseFloat(paydata.apr);
					}
				}
				if (screentrackingdata.isNoHit) {
					creditScore = "No Hit";
				}
				screenResdata.push({
					loopid: loopid,
					applicationReference: appReference,
					loanReference: loanReference,
					name: fullname,
					email: useremail,
					phoneNumber: userphoneNumber,
					payOffAmount: payOffAmountValue,
					apr: apr,
					creditScore: creditScore,
					practicename: practicename,
					fundingtier: fundingTier,
					createdAt: screentrackingdata.createdAt,
					updatedAt: screentrackingdata.updatedAt,
					lastScreenName: screentrackingdata.lastScreenName,
					promissoryNoteSign: promissoryNoteSign,
					registeredtype: userregisteredtype,
					applicationType: applicationType,
				});
			});
			var json = {
				sEcho: req.query.sEcho,
				iTotalRecords: totalrecords,
				iTotalDisplayRecords: totalrecords,
				aaData: screenResdata
			};
			res.contentType('application/json');
			res.json(json);
		});
	});

	function sortDataTables(type, screenDetails, sortBy, sortColumn) {
		// type = archived, openIncomplete, default
		if (type == "archived") {
			switch (sortColumn) {
				case '1': screenDetails = _.sortBy(screenDetails, 'applicationReference'); break;
				case '2': screenDetails = _.sortBy(screenDetails, 'paymentdata[0].loanReference'); break;
				case '3': screenDetails = _.sortBy(screenDetails, 'userdata[0].firstname'); break;
				case '4': screenDetails = _.sortBy(screenDetails, 'userdata[0].email'); break;
				case '5': screenDetails = _.sortBy(screenDetails, 'userdata[0].phoneNumber'); break;
				case '6': screenDetails = _.sortBy(screenDetails, 'practicedata[0].PracticeName'); break;
				case '7': screenDetails = _.sortBy(screenDetails, 'fundingTier'); break;
				case '8': screenDetails = _.sortBy(screenDetails, 'paymentdata[0].payOffAmount'); break;
				case '9': screenDetails = _.sortBy(screenDetails, 'paymentdata[0].apr'); break;
				case '10': screenDetails = _.sortBy(screenDetails, 'creditscore'); break;
				case '11': screenDetails = _.sortBy(screenDetails, 'createdAt'); break;
				case '12': screenDetails = _.sortBy(screenDetails, 'updatedAt'); break;
				case '13': screenDetails = _.sortBy(screenDetails, 'lastScreenName'); break;
				case '14': screenDetails = _.sortBy(screenDetails, 'userdata[0].registeredtype'); break;
				case '15': screenDetails = _.sortBy(screenDetails, 'paymentdata[0].achstatus'); break;
				default: break;
			};
		} else if (type == "openIncomplete") {
			switch (sortColumn) {
				case '1': screenDetails = _.sortBy(screenDetails, 'applicationReference'); break;
				case '2': screenDetails = _.sortBy(screenDetails, 'paymentdata[0].loanReference'); break;
				case '3': screenDetails = _.sortBy(screenDetails, 'userdata[0].firstname'); break;
				case '4': screenDetails = _.sortBy(screenDetails, 'userdata[0].email'); break;
				case '5': screenDetails = _.sortBy(screenDetails, 'userdata[0].phoneNumber'); break;
				case '6': screenDetails = _.sortBy(screenDetails, 'practicedata[0].PracticeName'); break;
				case '7': screenDetails = _.sortBy(screenDetails, 'fundingTier'); break;
				case '8': screenDetails = _.sortBy(screenDetails, 'creditscore'); break;
				case '9': screenDetails = _.sortBy(screenDetails, 'createdAt'); break;
				case '10': screenDetails = _.sortBy(screenDetails, 'updatedAt'); break;
				case '11': screenDetails = _.sortBy(screenDetails, 'lastScreenName'); break;
				case '12': screenDetails = _.sortBy(screenDetails, 'userdata[0].registeredtype'); break;
				default: break;
			};
		} else {
			switch (sortColumn) {
				case '1': screenDetails = _.sortBy(screenDetails, 'applicationReference'); break;
				case '2': screenDetails = _.sortBy(screenDetails, 'paymentdata[0].loanReference'); break;
				case '3': screenDetails = _.sortBy(screenDetails, 'userdata[0].firstname'); break;
				case '4': screenDetails = _.sortBy(screenDetails, 'userdata[0].email'); break;
				case '5': screenDetails = _.sortBy(screenDetails, 'userdata[0].phoneNumber'); break;
				case '6': screenDetails = _.sortBy(screenDetails, 'practicedata[0].PracticeName'); break;
				default: break;
			};
		}
		if (sortBy == 'desc') {
			screenDetails.reverse();
		}
		return screenDetails;
	}
}

function movetoUnarchiveAction(req, res) {
	var paymentID = req.param('paymentid');
	var payCriteria = { id: paymentID };
	PaymentManagement.findOne(payCriteria)
		.then(function (paymentmanagementdata) {
			//-- modified on nov 29, 2018
			paymentmanagementdata.moveToArchive = 0;
			paymentmanagementdata.status = "OPENED";
			paymentmanagementdata.save(function (err) {
				if (err) {
					req.session.approveerror = 'Unable to unarchive the application. Try again!';
					var json = {
						status: 400,
						message: "Unable to unarchive the application. Try again!"
					};
					res.contentType('application/json');
					res.json(json);
				}
				else {
					req.session.successmsg = 'Application unarchived successfully';
					var modulename = 'Application moved from archived to in progress contracts.';
					var modulemessage = 'Unarchived approved contracts.';
					req.achlog = 1;
					req.payID = paymentID;
					//req.logdata=paymentmanagementdata;
					Logactivity.registerLogActivity(req, modulename, modulemessage);
					var json = {
						status: 200,
						message: 'Application unarchived successfully.'
					};
					res.contentType('application/json');
					res.json(json);
				}
			})
		})
}

function providerlistAction(req, res) {

	return res.view("admin/practice/providerList");

}

function ajaxProviderAction(req, res) {

	var colS = "";
	var sorttype = 1;
	if (req.query.sSortDir_0 == 'desc') {
		var sorttype = -1;
	}

	switch (req.query.iSortCol_0) {
		case '0': var sorttypevalue = { '_id': sorttype }; break;
		case '1': var sorttypevalue = { 'providername': sorttype }; break;
		case '2': var sorttypevalue = { 'firstname': sorttype }; break;
		case '3': var sorttypevalue = { 'lastname': sorttype }; break;
		case '4': var sorttypevalue = { 'email': sorttype }; break;
		case '5': var sorttypevalue = { 'phonenumber': sorttype }; break;
		case '6': var sorttypevalue = { 'city': sorttype }; break;
		case '7': var sorttypevalue = { 'state': sorttype }; break;
		case '8': var sorttypevalue = { 'createdAt': sorttype }; break;
		default: break;
	};

	//Search
	if (req.query.sSearch) {
		sails.log.info("search value: ", req.query.sSearch);
		var criteria = {
			or: [{ providerName: { 'contains': req.query.sSearch } }, { firstName: { 'contains': req.query.sSearch } }, { lastName: { 'contains': req.query.sSearch } }, { emailAddress: { 'contains': req.query.sSearch } }, { city: { 'contains': req.query.sSearch } }, { state: { 'contains': req.query.sSearch } }, { createdAt: { 'contains': req.query.sSearch } }]
		};

	}
	else {
		var criteria = {};
	}


	var skiprecord = parseInt(req.query.iDisplayStart);
	var iDisplayLength = parseInt(req.query.iDisplayLength);
	var providerData = [];
	var totalrecords = 0;
	var loopid;
	Provider.count(criteria).exec(function countCB(error, totalrecords) {

		if (totalrecords > 0) {
			Provider
				.find(criteria)
				.sort(sorttypevalue)
				.skip(skiprecord)
				.limit(iDisplayLength)
				.then(function (providerDetails) {

					providerDetails.forEach(function (providerinfo, loopvalue) {
						loopid = loopvalue + skiprecord + 1;
						providerinfo.createdAt = moment(providerinfo.createdAt).format('MM-DD-YYYY');
						if ("undefined" === typeof providerinfo.providername || providerinfo.providername == '' || providerinfo.providername == null) {
							providerinfo.providername = '--';
						}

						if ("undefined" === typeof providerinfo.firstname || providerinfo.firstname == '' || providerinfo.firstname == null) {
							providerinfo.firstname = '--';
						}
						if ("undefined" === typeof providerinfo.lastname || providerinfo.lastname == '' || providerinfo.lastname == null) {
							providerinfo.lastname = '--';
						}
						if ("undefined" === typeof providerinfo.email || providerinfo.email == '' || providerinfo.email == null) {
							providerinfo.email = '--';
						}
						if ("undefined" === typeof providerinfo.city || providerinfo.city == '' || providerinfo.city == null) {
							providerinfo.city = '--';
						}
						if ("undefined" === typeof providerinfo.phonenumber || providerinfo.phonenumber == '' || providerinfo.phonenumber == null) {
							providerinfo.phonenumber = '--';
						}
						if ("undefined" === typeof providerinfo.state || providerinfo.state == '' || providerinfo.state == null) {
							providerinfo.state = '--';
						}
						if ("undefined" === typeof providerinfo.createdAt || providerinfo.createdAt == '' || providerinfo.createdAt == null) {
							providerinfo.createdAt = '--';
						}

						var actiondata = '<a href="/admin/createpractice/' + providerinfo.id + '"><i class="fa fa-eye" aria-hidden="true"></i></a>';

						providerData.push({ loopid: loopid, providerName: providerinfo.providername, firstName: providerinfo.firstname, lastName: providerinfo.lastname, emailAddress: providerinfo.email, city: providerinfo.city, phoneNumber: providerinfo.phonenumber, state: providerinfo.state, createdAt: providerinfo.createdAt, actiondata: actiondata });
					});

					var json = {
						sEcho: req.query.sEcho,
						iTotalRecords: totalrecords,
						iTotalDisplayRecords: totalrecords,
						aaData: providerData
					};
					res.contentType('application/json');
					res.json(json);
				});
		}
		else {
			var json = {
				sEcho: req.query.sEcho,
				iTotalRecords: totalrecords,
				iTotalDisplayRecords: totalrecords,
				aaData: providerData
			};
			res.contentType('application/json');
			res.json(json);
		}
	});
}

function confirmProcedure(req, res) {

	const payID = req.param("id");
	res.contentType("application/json");
	if (!payID) {
		throw new Error("Invalid Data");
	}

	return PaymentManagement.findOne({ id: payID })
		.then((paymentmanagementdata) => {
			if (paymentmanagementdata && paymentmanagementdata.procedureWasConfirmed == 1) {
				return;
			}
			return PaymentManagement.update({ id: payID }, {
				procedureWasConfirmed: 1,
				procedureConfirmedDate: moment().toDate(),
				status: "FUNDED"
			});
		})
		.then(() => {
			//uplodate first associate document
			return FirstAssociatesService.processAndUploadFirstAssociatesLoanDocument(payID);
		})
		.then(() => {
			//uplodate first associate document (in the folder "MHF Full File Spec Export")
			return FirstAssociatesService.processAndUploadFirstAssociatesLoanDocument_FullSpec(payID);
		})
		.then(() => {
			// Log Activity
			var modulename = "Confirm Procedure";
			var modulemessage = "Confirmed Procedure";
			req.achlog = 0;
			req.payID = payID;
			return Promise.resolve().then(() => {
				sails.log.info("ACHC ! req.session.hasOwnProperty( 'lastActivityId' )", !req.session.hasOwnProperty("lastActivityId"));
				sails.log.info("ACHC req.session.lastActivityId", req.session.lastActivityId);
				sails.log.info("ACHC payID", payID);

				return Logactivity.registerLogActivity(req, modulename, modulemessage);
			});
		})
		.then((results) => {
			res.json({
				message: "success"
			});
		}).catch((errorObj) => {
			sails.log.error("AchController#confirmProcedureAction :: err", errorObj);
			res.json({
				message: "Unable to generate first associate csv file"
			}, 500);
		});
}

function resetToPendingState(req, res) {
	const payID = req.param("payID");
	const userID = req.param("userID");
	res.contentType("application/json");
	if (!payID) {
		throw new Error("Invalid Data");
	}

	let criteria = {
		id: payID
	};
	return PaymentManagement.update(criteria, {
		achstatus: 0,
		status: "PENDING"
	})
		.then(function () {
			// Log Activity
			var modulename = "Reset to Pending";
			var modulemessage = "State reset to Pending";
			req.achlog = 0;
			req.payID = payID;
			return Promise.resolve().then(() => {
				sails.log.info("ACHC ! req.session.hasOwnProperty( 'lastActivityId' )", !req.session.hasOwnProperty("lastActivityId"));
				sails.log.info("ACHC req.session.lastActivityId", req.session.lastActivityId);
				sails.log.info("ACHC payID", payID);

				return Logactivity.registerLogActivity(req, modulename, modulemessage);
			});
		})
		.then(function (results) {
			req.session.successmsg = 'Successfully reset state to Pending';
			req.session.fromResetToPending = '1';
			return res.status(200).redirect("/admin/getAchUserDetails/" + payID);
		})
		.catch(function (errorObj) {
			sails.log.error("AchController#resetToPendingState :: err", errorObj);
			req.session.errorval = 'Something went wrong, unable to reset to Pending';
			req.session.fromResetToPending = '1';
			return res.status(500).redirect("/admin/getAchUserDetails/" + payID);
		});


}
