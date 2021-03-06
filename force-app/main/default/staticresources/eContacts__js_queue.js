function detectmob() {
    if (navigator.userAgent.match(/Android/i)
        || navigator.userAgent.match(/webOS/i)
        || navigator.userAgent.match(/iPhone/i)
        || navigator.userAgent.match(/iPad/i)
        || navigator.userAgent.match(/iPod/i)
        || navigator.userAgent.match(/BlackBerry/i)
        || navigator.userAgent.match(/Windows Phone/i)
       ) {
        return true;
    }
    else {
        return false;
    }
}

ECONTACTS_FTU_SETTINGS = (function (app) {
    
    // some constants to make it easier to work with the bitmask
    app.FUS_ALL = 262143;
    app.FUS_QUEUE_PAGE_WELCOME = 1;
    app.FUS_WARNING_IMG_FIELD_LEAD = 2;
    app.FUS_WARNING_IMG_FIELD_CONTACT = 4;
    app.FUS_WARNING_CREATEDBY_FIELD_LEAD = 8;
    app.FUS_WARNING_CREATEDBY_FIELD_CONTACT = 16;
    
    app.mask = 0;
    
    app.init = function (options) {
        if (typeof options.current_values != 'undefined') {
            app.mask = options.current_values;
        }
    };
    
    /*
     * Check if settings are enabled
     *
     * @param integer setting_mask	An integer representing one or more settings to check (use the constants defined at the top of this class)
     * @return boolean True if the setting(s) are enabled, false otherwise
     */
    app.isEnabled = function (setting_mask) {
        return ((app.mask & setting_mask) == setting_mask ? true : false);
    }
    
    return app;
    
}({}));

function formatPhone(value) {
    //doesn't reformat if it starts with a plus sign.
    if (value.charAt(0) == "+") {
        return value;
    }
    
    newString = value.replace(/\D/g, '');
    
    //check if the value only contains numbers
    if (isNaN(newString) == false) {
        if (newString.length <= 9) {
            return value;
        }
        if (newString.length == 10) {
            if (newString.charAt(0) === 1) {
                return value;
            }
        }
        
        if (newString.length == 11) {
            if (newString.charAt(0) === 1) {
                newString = newString.slice(1, 10);
            }
        }
        
        //check is the value has 10 characters in it.
        if (newString.length == 10) {
            var areaCode = newString.slice(0, 3);
            var threePiece = newString.slice(3, 6);
            var fourPiece = newString.slice(6, 10)
            var wholeNumber = "(" + areaCode + ") " + threePiece + "-" + fourPiece;
            return wholeNumber;
        }
    }
    
    return value;
}

function isIE(version, comparison) {
    var cc = 'IE',
        b = document.createElement('B'),
        docElem = document.documentElement,
        isIE;
    
    if (version) {
        cc += ' ' + version;
        if (comparison) { cc = comparison + ' ' + cc; }
    }
    
    b.innerHTML = '<!--[if ' + cc + ']><b id="iecctest"></b><![endif]-->';
    docElem.appendChild(b);
    isIE = !!document.getElementById('iecctest');
    docElem.removeChild(b);
    return isIE;
}


function updatePicklists(e) {
    
    var selectedType = $(e.target).val();
    var selects = $(e.target).closest('.ec_queue_item').find('.form-picklist').not('[controllername]');
    var dependSelects = $(e.target).closest('.ec_queue_item').find('[controllername]');
    
    //loop through select fields
    $(selects).each(function () {
        
        var name = $(this).attr('name');
        var key = selectedType + name;
        var vals = recordTypePicklistsJSON[key];
        
        if (typeof vals != 'undefined') {
            
            var selectbox = $(this);
            currentSelected = $(this).val();
            var placeholder = $(this)[0].options[0].outerHTML;
            selectbox.empty();
            var list = placeholder;
            
            //if select list is a dependent field get values from getDependentPicklistsOptions() function
            if($(this).attr('controllerName')){
                var dependVals = getDependentOptions(pObj, $(this).attr('controllerName'), $(this).attr('name'));
                //create the list options here and add to list variable
            }
            else{
            for (var i = 0; i < vals.length; i++) {
                var valsOption = vals[i].split('###');
                list += '<option value="' + valsOption[1] + '"' + (currentSelected == valsOption[1] ? 'selected' : '') + ' class="ec_picklist_index_' + i +'" style="" >' + valsOption[0] + '</option>';
                
            }
            }
            selectbox.html(list);
            setPlaceholderTextforPL(selectbox);
            
        }
        
    });
    if(dependSelects != null && dependSelects.length > 0){
        $(dependSelects).each(function () {
            var controlFld = $(e.target).closest('.tab-pane').find('select[name="'+ $(this).attr('controllername') + '"]');
            updateDependentPicklists(controlFld);        
        });
    }
    //reset placeholder classes in case and fields were not correctly set
    var ALLselects = $(e.target).closest('.ec_queue_item').find('.form-picklist');
    $(ALLselects).each(function(){
        setPlaceholderTextforPL($(this));
    });
}

/**
 * getDependentPicklistOptions
 * by Benj Kamm, 2012
 * (inspired by http://iwritecrappycode.wordpress.com/2012/02/23/dependent-picklists-in-salesforce-without-metadata-api-or-visualforce/)
 * CC BY-SA 3.0 (http://creativecommons.org/licenses/by-sa/3.0/us/)
 *
 * Build an Object in which keys are valid options for the controlling field
 * and values are lists of valid options for the dependent field.
 *
 * Method: dependent PickListEntry.validFor provides a base64 encoded
 * string. After decoding, each of the bits (reading L to R)
 * corresponds to the picklist values for the controlling field.
 */
function getDependentOptions (objName, ctrlFieldName, depFieldName) {
	// Isolate the Describe info for the relevant fields
	var objDesc = sforce.connection.describeSObject(objName);
	var ctrlFieldDesc, depFieldDesc;
	var found = 0;
	for (var i=0; i<objDesc.fields.length; i++) {
		var f = objDesc.fields[i];
		if (f.name == ctrlFieldName) {
			ctrlFieldDesc = f;
			found++;
		} else if (f.name == depFieldName) {
			depFieldDesc = f;
			found++;
		}
		if (found==2) break; 
	}

	// Set up return object
	var dependentOptions = {};
	var ctrlValues = ctrlFieldDesc.picklistValues;
	for (var i=0; i<ctrlValues.length; i++) {
		dependentOptions[ctrlValues[i].label] = [];
	}

	var base64 = new sforce.Base64Binary("");
	function testBit (validFor, pos) {
		var byteToCheck = Math.floor(pos/8);
		var bit = 7 - (pos % 8);
		return ((Math.pow(2, bit) & validFor.charCodeAt(byteToCheck)) >> bit) == 1;
	}
	
	// For each dependent value, check whether it is valid for each controlling value
	var depValues = depFieldDesc.picklistValues;
	for (var i=0; i<depValues.length; i++) {
		var thisOption = depValues[i];
		var validForDec = base64.decode(thisOption.validFor);
		for (var ctrlValue=0; ctrlValue<ctrlValues.length; ctrlValue++) {
			if (testBit(validForDec, ctrlValue)) {
				dependentOptions[ctrlValues[ctrlValue].label].push(thisOption.label + '###' + thisOption.value);
			}
		}
	}
	return dependentOptions;
}


window.JSON = window.JSON || {};
window.JSON.parse = window.JSON.parse || function (str) { return {}; };
window.JSON.stringify = window.JSON.stringify || function (ob) { return '{}'; };

// change PNotify defaults
PNotify.prototype.options.styling = "bootstrap3";
PNotify.prototype.options.addclass = "bootstrap-styles ec_pnotify";
PNotify.prototype.options.width = "auto";
PNotify.prototype.options.history.history = false;
PNotify.prototype.options.delay = 3000;
PNotify.prototype.options.icon = false;
PNotify.prototype.options.buttons.sticker = false;
PNotify.prototype.options.buttons.sticker_hover = false;
PNotify.prototype.options.buttons.closer = false;


// change Bootstrap Switch defaults
$.fn.bootstrapSwitch.defaults.onText = T.convert('1');
$.fn.bootstrapSwitch.defaults.offText = T.convert('2');
$.fn.bootstrapSwitch.defaults.labelWidth = '30px';

Visualforce.remoting.timeout = 120000;

// convert each CSV list for lookup result fields to an array
if (typeof ec_init_params.lookup_result_fields === 'object' && ec_init_params.lookup_result_fields.Account != '') {
    ec_init_params.lookup_result_fields['Account'] = ec_init_params.lookup_result_fields['Account'].split(',');
}

var ec_tpl_leadform = $('#ec_tpl_leadform');
var ec_tpl_contactform = $('#ec_tpl_contactform');

var ec_form_simple_whitelist;
var ec_form_blacklist;
var ec_form_adv_whitelist;

var ec_bundleIds = { images: {}, tasks: {}, signatures: {} }

var ec_pause_iscroll = true;		// used to pause the infinite scroll feature
var ec_field_blacklist = {
    Lead: {
        "Name": true,
        "EmailBouncedReason": true,
        "ConvertedDate": true,
        "Jigsaw": true,
        "LastActivityDate": true,
        "Deleted": true,
        "CreatedDate": true,
        "SystemModstamp": true,
        "LastModifiedDate": true,
        "EmailBouncedDate": true,
        "Converted": true,
        "eContacts__Business_Card__c": true
    },
    Contact: {
        "Name": true,
        "LastActivityDate": true,
        "EmailBouncedReason": true,
        "Jigsaw": true,
        "eContacts__Business_Card__c": true
    }
};
var ec_simple_form_fields = {
    Lead: {
        "FirstName": true,
        "LastName": true,
        "Title": true,
        "Company": true,
        "Email": true,
        "Phone": true,
        "MobilePhone": true,
        "Fax": true,
        "Street": true,
        "City": true,
        "State": true,
        "StateCode": true,
        "PostalCode": true,
        "Country": true,
        "CountryCode": true,
        "OwnerId": true,
        "LeadSource": true,
        "RecordTypeId": true,
        "Website": true
    },
    Contact: {
        "AccountId": true,
        "OwnerId": true,
        "FirstName": true,
        "LastName": true,
        "Title": true,
        "Company": true,
        "Email": true,
        "Phone": true,
        "MobilePhone": true,
        "Fax": true,
        "MailingStreet": true,
        "MailingCity": true,
        "MailingState": true,
        "MailingStateCode": true,
        "MailingPostalCode": true,
        "MailingCountry": true,
        "MailingCountryCode": true,
        "LeadSource": true,
        "RecordTypeId": true,
        "Website": true
    }
};
var ec_field_whitelist = new can.Map({
    Lead: {
        "FirstName": 0.5,
        "LastName": 0.5,
        "Title": 1,
        "Company": 1,
        "Email": 0.5,
        "Phone": 0.5,
        "MobilePhone": 0.5,
        "Fax": 0.5,
        "Street": 1,
        "City": 0.5,
        "State": 0.25,
        "StateCode": 0.25,
        "PostalCode": 0.25,
        "Country": 0.5,
        "CountryCode": 0.5,
        "OwnerId": 0.5,
        "LeadSource": 0.5,
        "RecordTypeId": 0.5,
        "Website": 0.5,
        "Industry": 0.5,
        "Campaign": 0.5,
        "AnnualRevenue": 0.5,
        "NumberOfEmployees": 0.5
    },
    Contact: {
        "AccountId": 0.5,
        "OwnerId": 0.5,
        "FirstName": 0.5,
        "LastName": 0.5,
        "Title": 1,
        "Email": 0.5,
        "Phone": 0.5,
        "MobilePhone": 0.5,
        "Fax": 0.5,
        "MailingStreet": 1,
        "MailingCity": 0.5,
        "MailingState": 0.25,
        "MailingStateCode": 0.25,
        "MailingPostalCode": 0.25,
        "MailingCountry": 0.5,
        "MailingCountryCode": 0.5,
        "LeadSource": 0.5,
        "RecordTypeId": 0.5,
        "Website": 0.5,
            //birthdate removed as default field on queue by zch 1/15/20
            //"Birthdate": 0.5,
        "Department": 0.5,
        "RecordTypeId": 0.5
    }
});

var ec_optimizations = new can.List();
ec_optimizations.bind('change', function (ev, index, how, newVal, oldVal) {
    // if there are no warnings, hide the panel group so layout is not affected
    if (ec_optimizations.attr().length == 0) {
        $('#ec_optimization_panel').fadeOut();
    }
    else {
        $('#ec_optimization_panel').fadeIn();
    }
});
var ec_warnings = new can.List();
ec_warnings.bind('change', function (ev, index, how, newVal, oldVal) {
    // if there are no warnings, hide the panel group so layout is not affected
    if (ec_warnings.attr().length == 0) {
        $('#ec_warning_panel').fadeOut();
    }
    else {
        $('#ec_warning_panel').fadeIn();
    }
});

// if notes are enabled, whitelist the appropriate fields and add to the simple form view
if (ec_show_notes) {
    ec_field_whitelist.attr('Lead.' + ec_notes_fields.Lead, 0.5);
    ec_field_whitelist.attr('Contact.' + ec_notes_fields.Contact, 0.5);
    
    ec_simple_form_fields.Lead[ec_notes_fields.Lead] = true;
    ec_simple_form_fields.Contact[ec_notes_fields.Contact] = true;
}

// detect if the org uses country and state picklists
var ec_cs_picklists = false;
var defaultCountry = "";

if (typeof ec_obDesc.attr('Lead.CountryCode') != 'undefined' || typeof ec_obDesc.attr('Contact.MailingCountryCode') != 'undefined') {
    
    
    ec_cs_picklists = true;
    
    ec_field_whitelist.removeAttr('Lead.State');
    ec_field_whitelist.removeAttr('Lead.Country');
    ec_field_whitelist.removeAttr('Contact.MailingState');
    ec_field_whitelist.removeAttr('Contact.MailingCountry');
    
    delete ec_simple_form_fields['Lead']['State'];
    delete ec_simple_form_fields['Lead']['Country'];
    delete ec_simple_form_fields['Contact']['MailingState'];
    delete ec_simple_form_fields['Contact']['MailingCountry'];
    
    
    if (ec_obDesc.attr('Lead') != null) {
        try {
            
            
            ec_obDesc.attr('Lead.StateCode.label', ec_obDesc.attr('Lead.State.label'));
            ec_obDesc.attr('Lead.CountryCode.label', ec_obDesc.attr('Lead.Country.label'));
        } catch (e) {
            console.log('problem setting lead state code label')
        }
    }
    if (ec_obDesc.attr('Contact') != null) {
        try {
            ec_obDesc.attr('Contact.MailingStateCode.label', ec_obDesc.attr('Contact.MailingState.label'));
            ec_obDesc.attr('Contact.MailingCountryCode.label', ec_obDesc.attr('Contact.MailingCountry.label'));
        } catch (e) {
            console.log('problem setting country state code label')
        }
    }
}
var ec_cspicklist_dep_cache = {};

// apply user customizations
if (ec_form_simple_whitelist != null && ec_form_simple_whitelist != '') {
    var fields = JSON.parse(ec_form_simple_whitelist);
    
    for (var ob in fields) {
        if (fields[ob] == null) {
            continue;
        }
        var ob_fields = fields[ob].split(',');
        
        // add each field to the list of simple fields and the whitelist
        for (var ii = 0; ii < ob_fields.length; ++ii) {
            var fieldparts = ob_fields[ii].split('@');
            var field = fieldparts[0];
            var size = parseFloat(fieldparts[1]);
            ec_simple_form_fields[ob][field] = true;
            ec_field_whitelist.attr(ob + '.' + field, size);
        }
    }
}
if (ec_form_adv_whitelist != null && ec_form_adv_whitelist != '') {
    var fields = JSON.parse(ec_form_adv_whitelist);
    for (var ob in fields) {
        if (fields[ob] == null) {
            continue;
        }
        var ob_fields = fields[ob].split(',');
        
        // add each field to the whitelist
        for (var ii = 0; ii < ob_fields.length; ++ii) {
            var fieldparts = ob_fields[ii].split('@');
            var field = fieldparts[0];
            var size = parseFloat(fieldparts[1]);
            ec_field_whitelist.attr(ob + '.' + field, size);
        }
    }
}
if (ec_form_blacklist != null && ec_form_blacklist != '') {
    var fields = JSON.parse(ec_form_blacklist);
    for (var ob in fields) {
        if (fields[ob] == null) {
            continue;
        }
        var ob_fields = fields[ob].split(',');
        
        // add each field to the blacklist
        for (var ii = 0; ii < ob_fields.length; ++ii) {
            var fieldparts = ob_fields[ii].split('@');
            var field = fieldparts[0];
            var size = parseFloat(fieldparts[1]);
            ec_field_blacklist[ob][field] = true;
        }
    }
}

var EC_IS_MOBILE = false;
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|Salesforce|IEMobile|Opera Mini/i.test(navigator.userAgent || navigator.vendor || window.opera)) {
    EC_IS_MOBILE = true;
}
var EC_QUEUE_FETCH_QTY = 10;
if (EC_IS_MOBILE) {
    EC_QUEUE_FETCH_QTY = 5;
}

var eContacts_app = new can.Map({
    pendingCount: parseInt(myPendingCount || 0),
    myPendingCount: parseInt(myPendingCount || 0),
    allPendingCount: parseInt(allPendingCount || 0),
    currentUser: $.parseJSON(ec_currentUser),
    myCardsOnly: true,
    tierData: ec_tierData,
    daysUntilReset: can.compute(function () {
        return ec_dayDiff(null, eContacts_app.attr('tierData.Next_Cap_Reset_Date'));
    }),
    visibleCardCount: 0,
    singleCardMode: false
});
eContacts_app.bind('change', function (ev, index, how, newVal, oldVal) {
    if (how == 'set') {
        // if the number of pending queue items changed...
        if (index == 'pendingCount') {
            newVal = parseInt(newVal);
            
            // if nothing is left to process, show the empty queue placeholder
            if (newVal == 0) {
                $('#ec_noitems').fadeIn(300);
            }
            else {
                $('#ec_noitems').slideUp();
            }
        }
        else if (index == 'myPendingCount' && eContacts_app.attr('myCardsOnly') == true) {
            eContacts_app.attr('pendingCount', parseInt(newVal));
        }
            else if (index == 'allPendingCount' && eContacts_app.attr('myCardsOnly') == false) {
                eContacts_app.attr('pendingCount', parseInt(newVal));
            }
                else if (index == 'myCardsOnly') {
                    // update pending count value
                    if (newVal == true) {
                        eContacts_app.attr('pendingCount', eContacts_app.attr('myPendingCount'));
                    }
                    else {
                        eContacts_app.attr('pendingCount', eContacts_app.attr('allPendingCount'));
                    }
                    
                    // get rid of current queue items on the page
                    ec_pause_iscroll = true;
                    $('#ec_page_process').fadeOut(200, function () {
                        ec_queueItems.splice(0);
                        $(this).empty();
                        
                        // hide the "card not found" message
                        $('#ec_card_not_found').hide();
                        
                        // get new result set
                        $('#ec_page_process').show();
                        ec_pause_iscroll = false;
                        ec_fetch_records(EC_QUEUE_FETCH_QTY);
                    });
                }
                    else if (index.match(/^tierData/g) != null) {
                        var indexParts = index.split('.');
                        
                        // if the user does has no limit, make sure the summary panel says unlimited
                        if (indexParts[1] == 'Ignore_Processing_Cap') {
                            if (newVal == true) {
                                $('#ec_limit_count').hide().next().show();
                            }
                            else {
                                $('#ec_limit_count').show().next().hide();
                            }
                        }
                        else if (indexParts[1] == 'Records_Processed') {
                            var cap = eContacts_app.attr('tierData.Processing_Cap');
                            var remaining = 0;
                            if (cap == 0 || eContacts_app.attr('tierData.Ignore_Processing_Cap') == true) {
                                remaining = 1;
                            }
                            else if (cap != null && newVal != null) {
                                remaining = (cap - newVal) / cap;
                            }
                            var count_el = $('#ec_col_processed .ec_processed_count');
                            if (remaining < 0.3) {
                                count_el.removeClass('ec_good').addClass('ec_bad');
                            }
                            else {
                                count_el.removeClass('ec_bad');
                                if (remaining > 0.5) {
                                    count_el.addClass('ec_good');
                                }
                            }
                        }
                            else if (indexParts[1] == 'Processing_Cap') {
                                var used = eContacts_app.attr('tierData.Records_Processed');
                                var remaining = 0;
                                if (newVal == 0 || eContacts_app.attr('tierData.Ignore_Processing_Cap') == true) {
                                    remaining = 1;
                                }
                                else if (used != null && newVal != null) {
                                    remaining = (newVal - used) / newVal;
                                }
                                var count_el = $('#ec_col_processed .ec_processed_count');
                                if (remaining < 0.3) {
                                    count_el.removeClass('ec_good').addClass('ec_bad');
                                }
                                else {
                                    count_el.removeClass('ec_bad');
                                    if (remaining > 0.5) {
                                        count_el.addClass('ec_good');
                                    }
                                }
                            }
                                else if (indexParts[1] == 'Hide_All_Cards_Toggle') {
                                    // hide the "my cards only" toggle depending on the org settings
                                    if (newVal == true) {
                                        $('#ec_owned_toggle_container').hide();
                                    }
                                    else {
                                        $('#ec_owned_toggle_container').show();
                                    }
                                }
                                    else if (indexParts[1] == 'Hide_Advanced_Mode_Toggle') {
                                        // hide the "Advanced Mode" toggle depending on the org settings
                                        if (newVal == true) {
                                            $('#ec_advanced_toggle_container').hide();
                                        }
                                        else {
                                            $('#ec_advanced_toggle_container').show();
                                        }
                                    }
                        
                        // if the user has reached their cap, modify the UI to let them know they can't process anything else
                        var ec_form_cols = $('#ec_page_process > .ec_queue_item .ec_right_col').children().not('.ec_btn-upgrade');
                        if (eContacts_app.attr('tierData.Ignore_Processing_Cap') == false && (eContacts_app.attr('tierData.Records_Processed') >= eContacts_app.attr('tierData.Processing_Cap'))) {
                            // show upgrade cta
                            $('#ec_col_processed .ec_summary > .panel-body > .cta').slideDown();
                            $('#ve_ec_container').addClass('ec_limit_reached');
                            
                            // disable form elements and obscure the forms
                            ec_form_cols.find('input, select, button').prop('disabled', true);
                            ec_form_cols.find('li').addClass('disabled');
                        }
                        else {
                            // hide upgrade cta
                            $('#ec_col_processed .ec_summary > .panel-body > .cta').slideUp();
                            $('#ve_ec_container').removeClass('ec_limit_reached');
                            
                            // enable form elements
                            ec_form_cols.find('input, select').prop('disabled', false);
                            ec_form_cols.find('li').removeClass('disabled');
                        }
                    }
                        else if (index == 'visibleCardCount') {
                            
                            // if no cards are visible in the queue, try to fetch more
                            if (newVal < 1) {
                                // once the card is processed or deleted in single card mode, turn infinite scroll back on
                                if (eContacts_app.attr('singleCardMode') == true) {
                                    ec_pause_iscroll = true;
                                    //eContacts_app.attr('singleCardMode', false);
                                    //
                                    //
                                    //
                                    //
                                    //
                                    
                                    setTimeout(function () {
                                        
                                        $('#ec_noitems').fadeIn();
                                    }, 2000);
                                    
                                }
                                
                                ec_fetch_records(EC_QUEUE_FETCH_QTY);
                            }
                            // otherwise, make sure the "card not found" message is hidden
                            else {
                                $('#ec_card_not_found').slideUp();
                            }
                        }
    }
});

// register a helper function with mustache to find the number of days between two dates
can.Mustache.registerHelper('dayDiff', function (start, end) {
    return ec_dayDiff(start, end);
});

// register mustache helper to translate text
can.mustache.registerHelper('translate', function (params) {
    var args = Array.prototype.slice.call(arguments);
    var vars = args.slice(1);
    for (var ii = 0; ii < vars.length; ++ii) {
        if (typeof vars[ii] == 'function') {
            vars[ii] = vars[ii]();
            // if it was a compute, the function will return another function
            if (typeof vars[ii] == 'function') {
                vars[ii] = vars[ii]();
            }
        }
    }
    return T.convert(args[0], vars);
});

// create the account summary panel
$('#ec_col_processed .ec_summary > .panel-body').html(
    can.view('ec_tpl_summary', eContacts_app)
);

// find the number of days between 2 dates
function ec_dayDiff(start, end) {
    if (typeof start == 'function') {
        start = start();
    }
    if (typeof end == 'function') {
        end = end();
    }
    if (start == null) {
        start = new Date();
    }
    else {
        start = new Date(start);
    }
    if (end == null) {
        end = new Date();
    }
    else {
        end = new Date(end);
    }
    
    // (difference between dates in ms) / 1000 ms / 60 seconds / 60 minutes / 24 hours
    return Math.ceil((end - start) / 86400000);
}

// handle changes to queue items
ec_queueItems.bind('change', function (ev, index, how, newVal, oldVal) {
    // console.log('queueItems change', ev, index, how, newVal, oldVal);
    if (how == 'set') {
        if (index.match(/eContacts__Processed__c$/g) != null) {
            $('.ec_processed').fadeIn();
            
            // update the pending queue item counts
            var indexparts = index.split('.');
            var ec_count;
            
            if (oldVal == false && newVal == true) {
                // if the user processed a card then decrement the visible card count before moving it
                eContacts_app.attr('visibleCardCount', eContacts_app.attr('visibleCardCount') - 1);
                
                eContacts_app.attr('allPendingCount', eContacts_app.attr('allPendingCount') - 1);
                if (ec_queueItems.attr(indexparts[0] + '.OwnerId') == eContacts_app.attr('currentUser.Id')) {
                    eContacts_app.attr('myPendingCount', eContacts_app.attr('myPendingCount') - 1);
                }
                
                if (eContacts_app.attr('myCardsOnly') == true) {
                    ec_count = eContacts_app.attr('myPendingCount');
                }
                else {
                    ec_count = eContacts_app.attr('allPendingCount');
                }
                eContacts_app.attr('pendingCount', ec_count);
                var q = $('#' + ec_queueItems.attr(indexparts[0] + '.Id') + '-' + indexparts[0]);
                q.slideUp(600, function () {
                    // move to right column
                    var qp = $('<div></div>').html(can.view('ec_tpl_queue_item_processed', ec_queueItems.attr(indexparts[0])));
                    var img = qp.find('.ec_bcard');
                    var src = img.attr('src');
                    if (src.length == 0) {
                        img.attr('src', 'data:image/jpeg;base64,' + ec_queueItems.attr(indexparts[0] + '.eContacts__Card_Image__c'));
                        if(ec_queueItems.attr(indexparts[0] + '.eContacts__Card_Image__c').length > 0){
                            //remove the button
                            qp.find('.ec_btn_reloadImage').style.display='none';
                        }
                    }
                    else {
                        //remove the button
                    }
                    qp.css({ width: '100%', visibility: 'hidden' }).find('.ec_left_col');
                    $('#ec_col_processed > div > div.panel-body > ul').append(qp.html()).children('li:last').fadeIn();
                });
            }
            else if (oldVal == true && newVal == false) {
                // if the card switches to unprocessed then increment the visible card count before moving it
                eContacts_app.attr('visibleCardCount', eContacts_app.attr('visibleCardCount') + 1);
                
                eContacts_app.attr('allPendingCount', eContacts_app.attr('allPendingCount') + 1);
                if (ec_queueItems.attr(indexparts[0] + '.OwnerId') == eContacts_app.attr('currentUser.Id')) {
                    eContacts_app.attr('myPendingCount', eContacts_app.attr('myPendingCount') + 1);
                }
                
                if (eContacts_app.attr('myCardsOnly') == true) {
                    ec_count = eContacts_app.attr('myPendingCount');
                }
                else {
                    ec_count = eContacts_app.attr('allPendingCount');
                }
                eContacts_app.attr('pendingCount', ec_count);
            }
        }
        else if (index.match(/UserDeleted$/g) != null) {
            if (oldVal == false && newVal == true) {
                // if the user deleted a card then decrement the visible card count before hiding the card
                eContacts_app.attr('visibleCardCount', eContacts_app.attr('visibleCardCount') - 1);
                
                ec_pause_iscroll = true;
                var indexParts = index.split('.');
                $('#' + ec_queueItems.attr(indexParts[0] + '.Id') + '-' + indexParts[0]).slideUp(500, function () {
                    eContacts_app.attr('allPendingCount', eContacts_app.attr('allPendingCount') - 1);
                    if (ec_queueItems.attr(indexParts[0] + '.OwnerId') == eContacts_app.attr('currentUser.Id')) {
                        eContacts_app.attr('myPendingCount', eContacts_app.attr('myPendingCount') - 1);
                    }
                    
                    var ec_count;
                    if (eContacts_app.attr('myCardsOnly') == true) {
                        ec_count = eContacts_app.attr('myPendingCount');
                    }
                    else {
                        ec_count = eContacts_app.attr('allPendingCount');
                    }
                    eContacts_app.attr('pendingCount', ec_count);
                    $(this).detach();
                    ec_pause_iscroll = false;
                });
            }
            else {
                eContacts_app.attr('visibleCardCount', eContacts_app.attr('visibleCardCount') + 1);
            }
        }
    }
    else if (how == 'add') {
        if (typeof index == 'string' && index.search('\\.') != -1) {
            return;
        }
        
        // increment the visible card count
        var cardCount = 1;
        if (typeof newVal.length != 'undefined') { // newVal can be an array or single object
            cardCount = newVal.length;
        }
        eContacts_app.attr('visibleCardCount', eContacts_app.attr('visibleCardCount') + cardCount);
        
        var gridHTML = $('<div></div>');
        var qSelectors = [];
        var timeNow = new Date();
        
        // get html for queue items ready for DOM
        for (var ii = index; ii < ec_queueItems.attr('length'); ++ii) {
            var q = ec_queueItems.attr(ii);
            q.attr('UserDeleted', false);
            qSelectors.push('#' + q.attr('Id') + '-' + ii);
            //	console.log('q', q);
            var createDate = q.attr('CreatedDate');
            if (typeof createDate == 'string') {
                q.attr('CreatedDate', q.attr('CreatedDate').split('.')[0] + 'Z');
            }
            else if (typeof createDate == 'number') {
                q.attr('CreatedDate', new Date(q.attr('CreatedDate')));
            }
            
            q.attr('listpos', ii);
            // if there is ocr data, let the user see it
            var ocr = ec_queueItems.attr(ii + '.eContacts__OCR_Data__c') || null;
            
            
            
            
            var raw_ocr = null;
            
            if (ec_tierData.OCR_Enabled == 'false') {
                q.attr('OCR_Status', T.convert('40'));
            }
            
            else if (ocr != null && ocr.indexOf('{"status":"disabled"}') != -1) {
                q.attr('OCR_Status', T.convert('40'));
            }
            
                else if (ocr != null && ocr != '') {
                    raw_ocr = JSON.parse(ocr);
                    q.attr('OCR_Status', T.convert('39'));
                    ocr = {
                        misc: [],
                        phone_office: [],
                        phone_fax: [],
                        phone_mobile: [],
                        email: [],
                        address: [],
                        address_street: [],
                        address_city: [],
                        address_state: [],
                        address_zip: [],
                        address_country: [],
                        company: [],
                        website: [],
                        title: [],
                        firstname: [],
                        lastname: []
                    };
                    if (raw_ocr['email']) {
                        if (typeof raw_ocr['email'] == 'object') {
                            ocr.email = ocr.email.concat(raw_ocr['email']);
                        }
                        else {
                            ocr.email.push(raw_ocr['email']);
                        }
                    }
                    
                    if (raw_ocr['phone_office']) {
                        if (typeof raw_ocr['phone_office'] == 'object') {
                            ocr.phone_office = ocr.phone_office.concat(raw_ocr['phone_office']);
                        }
                        else {
                            ocr.phone_office.push(raw_ocr['phone_office']);
                        }
                    }
                    if (raw_ocr['phone_mobile']) {
                        if (typeof raw_ocr['phone_mobile'] == 'object') {
                            ocr.phone_mobile = ocr.phone_mobile.concat(raw_ocr['phone_mobile']);
                        }
                        else {
                            ocr.phone_mobile.push(raw_ocr['phone_mobile']);
                        }
                    }
                    if (raw_ocr['phone_fax']) {
                        if (typeof raw_ocr['phone_fax'] == 'object') {
                            ocr.phone_fax = ocr.phone_fax.concat(raw_ocr['phone_fax']);
                        }
                        else {
                            ocr.phone_fax.push(raw_ocr['phone_fax']);
                        }
                    }
                    if (raw_ocr['address']) {
                        if (typeof raw_ocr['address'] == 'object') {
                            ocr.address = ocr.address.concat(raw_ocr['address']);
                        }
                        else {
                            ocr.address.push(raw_ocr['address']);
                        }
                    }
                    if (raw_ocr['address_street']) {
                        if (typeof raw_ocr['address_street'] == 'object') {
                            ocr.address_street = ocr.address_street.concat(raw_ocr['address_street']);
                        }
                        else {
                            ocr.address_street.push(raw_ocr['address_street']);
                        }
                    }
                    if (raw_ocr['address_city']) {
                        if (typeof raw_ocr['address_city'] == 'object') {
                            ocr.address_city = ocr.address_city.concat(raw_ocr['address_city']);
                        }
                        else {
                            ocr.address_city.push(raw_ocr['address_city']);
                        }
                    }
                    if (raw_ocr['address_state']) {
                        if (typeof raw_ocr['address_state'] == 'object') {
                            ocr.address_state = ocr.address_state.concat(raw_ocr['address_state']);
                        }
                        else {
                            ocr.address_state.push(raw_ocr['address_state']);
                        }
                    }
                    if (raw_ocr['address_zip']) {
                        if (typeof raw_ocr['address_zip'] == 'object') {
                            ocr.address_zip = ocr.address_zip.concat(raw_ocr['address_zip']);
                        }
                        else {
                            ocr.address_zip.push(raw_ocr['address_zip']);
                        }
                    }
                    if (raw_ocr['address_country']) {
                        if (typeof raw_ocr['address_country'] == 'object') {
                            ocr.address_country = ocr.address_country.concat(raw_ocr['address_country']);
                        }
                        else {
                            ocr.address_country.push(raw_ocr['address_country']);
                        }
                    }
                    if (raw_ocr['company']) {
                        if (typeof raw_ocr['company'] == 'object') {
                            ocr.company = ocr.company.concat(raw_ocr['company']);
                        }
                        else {
                            ocr.company.push(raw_ocr['company']);
                        }
                    }
                    if (raw_ocr['website']) {
                        if (typeof raw_ocr['website'] == 'object') {
                            ocr.website = ocr.website.concat(raw_ocr['website']);
                        }
                        else {
                            ocr.website.push(raw_ocr['website']);
                        }
                    }
                    if (raw_ocr['title']) {
                        if (typeof raw_ocr['title'] == 'object') {
                            ocr.title = ocr.title.concat(raw_ocr['title']);
                        }
                        else {
                            ocr.title.push(raw_ocr['title']);
                        }
                    }
                    if (raw_ocr['firstname']) {
                        if (typeof raw_ocr['firstname'] == 'object') {
                            ocr.firstname = ocr.firstname.concat(raw_ocr['firstname']);
                        }
                        else {
                            ocr.firstname.push(raw_ocr['firstname']);
                        }
                    }
                    if (raw_ocr['lastname']) {
                        if (typeof raw_ocr['lastname'] == 'object') {
                            ocr.lastname = ocr.lastname.concat(raw_ocr['lastname']);
                        }
                        else {
                            ocr.lastname.push(raw_ocr['lastname']);
                        }
                    }
                    if (raw_ocr['misc']) {
                        if (typeof raw_ocr['misc'] == 'object') {
                            ocr.misc = ocr.misc.concat(raw_ocr['misc']);
                        }
                        else {
                            ocr.misc.push(raw_ocr['misc']);
                        }
                    }
                    
                    
                    // format phones
                    $.each(ocr.phone_office, function (key, value) {
                        ocr.phone_office[key] = formatPhone(value);
                    });
                    $.each(ocr.phone_fax, function (key, value) {
                        ocr.phone_fax[key] = formatPhone(value);
                    });
                    $.each(ocr.phone_mobile, function (key, value) {
                        ocr.phone_mobile[key] = formatPhone(value);
                    });
                    ec_queueItems.attr(ii + '.ocr', new can.Map(ocr));
                }
            
                    else {
                        q.attr('OCR_Status', T.convert('41'));
                    }
            var qhtml = $('<div></div>').html(can.view('ec_tpl_queue_item', q));
            
            // if the lead object does not exist, remove that tab from the UI
            if (ec_obDesc.attr('Lead') == null) {
                //qhtml.find('.ec_right_col > .nav > li:first, .ec_right_col > .tab-content > .tab-pane:first').remove();
                //qhtml.find('.ec_right_col > .nav > li:first, .ec_right_col > .tab-content > .tab-pane:first').removeClass('fade').addClass('active');
            }
            
            
            
            
            // set the secondary image
            // 
            
            if (q.attr('eContacts__Bundle__c') && typeof ec_bundleIds.images[q.attr('eContacts__Bundle__c')].eContacts__Secondary_Image__c != 'undefined') {
                var img = qhtml.find('img.secondaryImage');
                b64 = 'data:image/jpeg;base64,' + ec_bundleIds.images[q.attr('eContacts__Bundle__c')].eContacts__Secondary_Image__c;
                img.attr('src', b64);
                img.fadeIn();
                
            }
            // set the 
            // 
            
            if (q.attr('eContacts__Bundle__c') && typeof ec_bundleIds.signatures[q.attr('eContacts__Bundle__c')].eContacts__Secondary_Image__c != 'undefined') {
                var img = qhtml.find('img.signature');
                b64 = 'data:image/jpeg;base64,' + ec_bundleIds.signatures[q.attr('eContacts__Bundle__c')].eContacts__Secondary_Image__c;
                img.attr('src', b64);
                img.fadeIn();
                
            }
            //set the task voice memo link
            if (q.attr('eContacts__Bundle__c') && typeof ec_bundleIds.tasks[q.attr('eContacts__Bundle__c')].Id != 'undefined') {
                var container = qhtml.find('div.taskLink');
                container.html('<a class="btn btn-primary" href="/' + ec_bundleIds.tasks[q.attr('eContacts__Bundle__c')].Id + '" target="_blank">View Voice Memo <span class="glyphicon glyphicon-music"></span></a>')
                
                
            }
            
            //if(survey.records)alert(JSON.stringify(survey.records.Id))
            
            //if(document.referrer.indexOf('lightning')==-1){
            //
            var survey = sforce.connection.query("Select Id,eContacts__Bundle__c FROM eContacts__Responses__c WHERE eContacts__Bundle__c = '" + q.attr('eContacts__Bundle__c') + "'");
            if (survey.records) {
                var container = qhtml.find('div.taskLink');
                var formReport = sforce.connection.query("Select Id FROM Report WHERE Name = 'Form Responses'");
                var rid = formReport.records.Id;
                container.append('<a class="btn btn-primary" href="/' + rid + '?pv0=' + q.attr('eContacts__Bundle__c') + '" target="_blank">Survey <span class="glyphicon glyphicon-list-alt"></span></a>');
            }
            //}
            //else{
            //container.append('<a class="btn btn-primary" href="/00O0H000006pbui?pv0='+ec_bundleIds.tasks[q.attr('eContacts__Bundle__c')].Id+'" target="_blank">Survey <span class="glyphicon glyphicon-list-alt"></span></a>')    
            //}
            
            
            
            
            
            // set the card image url
            var img = qhtml.find('img.ec_bcard');
            
            var b64 = q.attr('eContacts__Card_Image__c');
 			var rldBtn = qhtml.find('.ec_btn_reloadImage')[0];
            if (b64 == null) {
                b64 = '';
            }
            else if (b64.length > 500) {
                b64 = 'data:image/jpeg;base64,' + b64;
				rldBtn.style.display = "none";
            }
            img.attr('src', b64);
            
            
            
            // if advanced mode is not on, hide fields that should not be shown
            if ($("#ec_advanced_toggle").bootstrapSwitch('state') == false) {
                qhtml.find('div.ec_right_col div.form-group').not('.ec_required_field, .ec_simple_field').hide();
            }
            
            // update the css of OCR status based on the value
            var ocr_status = q.attr('OCR_Status');
            // complete
            if (ocr_status == T.convert('39')) {
                qhtml.find('.ec_ocr_status .badge').addClass('ec_good');
            }
            // disabled
            else if (ocr_status == T.convert('40')) {
                var f = qhtml.find('.ec_ocr_status .badge');
                
                if (ec_tierData.OCR_Enabled != 'false') {
                    //q.addClass('ec_good');
                    q.attr('OCR_Status', "Not Processed");
                    f.after('<a href="https://www.visione.com/faq-scan/" target="_blank"><span class="glyphicon glyphicon-question-sign" style="margin-left:5px;"></span></a>');
                    
                }
                
                if (ec_tierData.OCR_Enabled == 'false') {
                    f.addClass('ec_bad');
                    f.after('<a href="https://www.visione.com/scan-premium/?utm_source=salesforce&utm_medium=link&utm_content=Click%20here%20to%20Try%20OCR&utm_campaign=upgrade" target="_blank" style="text-decoration:underline;padding-left:5px;">Click here to Try OCR</a>');
                }
                
            }
            
                else if (Math.abs(timeNow - new Date(q.attr('CreatedDate'))) > 3600000) {
                    q.attr('OCR_Status', "Complete");
                    qhtml.find('.ec_ocr_status .badge').addClass('ec_good');
                }
            
            // in progress
                    else {
                        qhtml.find('.ec_ocr_status .badge').addClass('ec_ok');
                    }
            
            qhtml.children('div').appendTo(gridHTML);
            
        }
        
        // show the queue items
        gridHTML.children('div').appendTo($('#ec_page_process'));
        
        // bind event handlers for queue items
        ec_bindQueueBtns($(qSelectors.join(',')));
        
        // if the org has reached the processing limit then we need to disable the form elements
        var limitReached = $('#ve_ec_container').hasClass('ec_limit_reached');
        if (limitReached) {
            var ec_form_cols = $(qSelectors.join(',')).find('.ec_right_col').children().not('.ec_btn-upgrade');
            ec_form_cols.find('input, select, button').prop('disabled', true);
            ec_form_cols.find('li').removeClass('disabled');
        }
        
        // store references to DOM representation of each queue item and use ocr data to fill out the forms
        for (var ii = index; ii < ec_queueItems.attr('length'); ++ii) {
            var q = ec_queueItems.attr(ii);
            var qitem = $('#' + q.attr('Id') + '-' + ii);
            ec_queueItems.attr(ii + '.domRef', qitem);
            
            // try to auto-fill the form
            var ocr = ec_queueItems.attr(ii + '.ocr') || null;
            if (ocr != null) {
                // phone numbers
                
                if (ocr['phone_office']) {
                    qitem.find('input[name=Phone]').val(ocr['phone_office'][0]);
                }
                if (ocr['phone_fax']) {
                    qitem.find('input[name=Fax]').val(ocr['phone_fax'][0]);
                }
                if (ocr['phone_mobile']) {
                    qitem.find('input[name=MobilePhone]').val(ocr['phone_mobile'][0]);
                }
                
                // email
                if (ocr['email']) {
                    qitem.find('input[name=Email]').val(ocr['email'][0]);
                }
                
                // address
                if (ocr['address_street']) {
                    qitem.find('textarea[name=Street], textarea[name=MailingStreet]').val(ocr['address_street'][0]);
                }
                if (ocr['address_city']) {
                    qitem.find('input[name=City], input[name=MailingCity]').val(ocr['address_city'][0]);
                }
                // country must be set before state in orgs with country/state picklists enabled so that the state list values can be set properly
                if (ocr['address_country']) {
                    if (ec_cs_picklists && (typeof ocr['address_country'][0] == 'undefined' || ocr['address_country'][0] == '' || ocr['address_country'][0].length > 2)) {
                        ocr['address_country'][0] = defaultCountry;
                    }
                    
                    var val = ocr['address_country'][0];
                    
                    // if country/state picklists are not enabled, use the plain text fields directly
                    if (ec_cs_picklists == false) {
                        qitem.find('input[name=Country], input[name=MailingCountry]').val(val);
                    }
                    // otherwise, try to find the ocr value in the state/country code dropdowns instead
                    else {
                        var selects = qitem.find('select[name=CountryCode], select[name=MailingCountryCode]');
                        var op = (val == null || val == '' ? $() : selects.first().find('option[value="' + val + '"]'));
                        
                        // if we couldn't find the exact text as a value...
                        if (op.size() == 0) {
                            // check each option to see if the body text matches (case insensitive)
                            selects.find('option').each(function (index, el) {
                                
                                var regex = new RegExp('^' + val + '$', 'i');
                                
                                var el_ob = $(this);
                                
                                // if the text matches, select that option and trigger the change event
                                if (regex.test(el_ob.text())) {
                                    selects.val(el_ob.val()).trigger('change');
                                    return false;	// now that we know which option matches we can stop the looping
                                }
                            });
                        }
                        // otherwise, we can just select the right option by value
                        else {
                            selects.val(val).trigger('change');
                        }
                    }
                }
                if (ocr['address_state']) {
                    var val = ocr['address_state'][0];
                    
                    // need to reset the state list by reseting the country drop-down
                    qitem.find('select[name=CountryCode], select[name=MailingCountryCode]').trigger('change');
                    
                    // if country/state picklists are not enabled, use the plain text fields directly
                    if (ec_cs_picklists == false) {
                        qitem.find('input[name=State], input[name=MailingState]').val(val);
                    }
                    // otherwise, try to find the ocr value in the state/country code dropdowns instead
                    else {
                        var selects = qitem.find('select[name=StateCode], select[name=MailingStateCode]');
                        var op = (val == null || val == '' ? $() : selects.first().find('option[value="' + val + '"]'));
                        
                        // if we couldn't find the exact text as a value...
                        if (op.size() == 0) {
                            // check each option to see if the body text matches (case insensitive)
                            selects.find('option').each(function (index, el) {
                                var regex = new RegExp('^' + val + '$', 'i');
                                var el_ob = $(this);
                                
                                // if the text matches, select that option and trigger the change event
                                if (regex.test(el_ob.text())) {
                                    selects.each(function (sel_index, sel) { $(this).val(el_ob.val()).trigger('change'); });
                                    return false;	// now that we know which option matches we can stop the looping
                                }
                            });
                        }
                        // otherwise, we can just select the right option by value
                        else {
                            selects.val(val).trigger('change');
                        }
                    }
                }
                if (ocr['address_zip']) {
                    qitem.find('input[name=PostalCode], input[name=MailingPostalCode]').val(ocr['address_zip'][0]);
                }
                
                // company
                if (ocr['company']) {
                    qitem.find('input[name=Company]').val(ocr['company'][0]);
                    
                    if (customCompanyNameField != '') {
                        qitem.find('input[name=' + customCompanyNameField + ']').val(ocr['company'][0]);
                    }
                }
                
                // website
                if (ocr['website']) {
                    qitem.find('input[name=Website]').val(ocr['website'][0]);
                }
                
                // title
                if (ocr['title']) {
                    qitem.find('input[name=Title]').val(ocr['title'][0]);
                }
                
                // name
                if (ocr['firstname']) {
                    qitem.find('input[name=FirstName]').val(ocr['firstname'][0]);
                }
                if (ocr['lastname']) {
                    qitem.find('input[name=LastName]').val(ocr['lastname'][0]);
                }
            }
            // set the owner for the new record to the user that uploaded the card
            qitem.find('input.ec_lookup_field[name=OwnerId]').val(q.attr('Owner.Name'));
            qitem.find('input.ec_lookup_field_val[name=OwnerId]').val(q.attr('Owner.Id'));
            
            qitem.find('input[name=language]').val(q.attr('eContacts__Language__c'));
            
            // populate the notes fields
            if (ec_show_notes) {
                qitem.find("input[name='" + ec_notes_fields.Lead + "'], input[name='" + ec_notes_fields.Contact + "'], textarea[name='" + ec_notes_fields.Lead + "'], textarea[name='" + ec_notes_fields.Contact + "']").val(q.attr('eContacts__Notes__c'));
            }
            
            // checks for tab delimited qr code string in the notes field. Specific to format provided for Cigna. Checks for the (9) tab format.
            // displays values on Scanning Queue if and only if specific format is found.
            var encodedNotes = encodeURI(q.attr('eContacts__Notes__c'));
           	if (encodedNotes.search('%09') >= 0){
               var qrParts = encodedNotes.split('%09');
                if(qrParts.length === 8){
                    qitem.find('input[name=FirstName]').val(decodeURI(qrParts[1]));
                    qitem.find('input[name=LastName]').val(decodeURI(qrParts[0]));
                    qitem.find('input[name=Company]').val(decodeURI(qrParts[0]) + ' Household');
                    qitem.find('textarea[name=Street], textarea[name=MailingStreet]').val(decodeURI(qrParts[2]) + " " + decodeURI(qrParts[3]));
                    qitem.find('input[name=City], input[name=MailingCity]').val(decodeURI(qrParts[4]));
                    qitem.find('select[name=LeadSource]').val('BRC');
                    qitem.find('select[name=LeadSource]').trigger('change');
                    var valQR = decodeURI(qrParts[5]);
                    
                    // need to reset the state list by reseting the country drop-down
                    qitem.find('select[name=CountryCode], select[name=MailingCountryCode]').trigger('change');
                    
                    // if country/state picklists are not enabled, use the plain text fields directly
                    if (ec_cs_picklists == false) {
                        qitem.find('input[name=State], input[name=MailingState]').val(valQR);
                    }
                    // otherwise, try to find the ocr value in the state/country code dropdowns instead
                    else {
                        var selects = qitem.find('select[name=StateCode], select[name=MailingStateCode]');
                        var op = (valQR == null || valQR == '' ? $() : selects.first().find('option[value="' + valQR + '"]'));
                        
                        // if we couldn't find the exact text as a value...
                        if (op.size() == 0) {
                            // check each option to see if the body text matches (case insensitive)
                            selects.find('option').each(function (index, el) {
                                var regex = new RegExp('^' + valQR + '$', 'i');
                                var el_ob = $(this);
                                
                                // if the text matches, select that option and trigger the change event
                                if (regex.test(el_ob.text())) {
                                    selects.each(function (sel_index, sel) { $(this).val(el_ob.val()).trigger('change'); });
                                    return false;	// now that we know which option matches we can stop the looping
                                }
                            });
                        }
                        // otherwise, we can just select the right option by value
                        else {
                            selects.val(valQR).trigger('change');
                        }
                    }
                    qitem.find('input[name=PostalCode], input[name=MailingPostalCode]').val(decodeURI(qrParts[6]));
                    //populate Custom fields
                    qitem.find('textarea[name=Residential_Address__c]').val(decodeURI(qrParts[2]));
                    qitem.find('input[name=Residential_Address_Line_2__c]').val(decodeURI(qrParts[3]));
                    qitem.find('input[name=Residential_City__c]').val(decodeURI(qrParts[4]));
                    qitem.find('select[name=Residential_State__c]').val(valQR);
                    qitem.find('input[name=Residential_Zip_Code__c]').val(decodeURI(qrParts[6]));
                    
                	qitem.find('input[name=Project_Code__c]').val(decodeURI(qrParts[7]));
                }
          	 }
        }
    }
});

/*
 * Generates the HTML to represent an object's field
 * 
 * @param object A can.js map representing a salesforce field describe result
 * @param string The object type (lead, contact, etc.)
 * @return string The HTML representation of the field
 */
function ec_getFieldHTML(fieldMeta, obType) {
    
    
    var field_html = '';
    var isRequired = false;
    var isSimple = false;
    var fieldSize = 12;
    var readOnly = true;
    var isDependent = false;
    var controllerName = ''
    
    if (fieldMeta == null || obType == null) {
        return '';
    }
    //determine if field is dependent
    if (fieldMeta.attr('dependentPicklist') == true){
    	isDependent = true;
        controllerName = fieldMeta.attr('controllerName');
    }
    
    // determine if field is required
    if (fieldMeta.attr('createable') == true && fieldMeta.attr('nillable') == false && fieldMeta.attr('defaultedOnCreate') == false) {
        isRequired = true;
    }
    
    // determine if field can be updated
    if (fieldMeta.attr('updateable') == true && fieldMeta.attr('createable') == true) {
        readOnly = false;
    }
    
    // determine if field belongs in the simple form
    if (ec_simple_form_fields[obType] != null && ec_simple_form_fields[obType][fieldMeta.attr('name')] != null) {
        isSimple = true;
    }
    
    // make sure the field is whitelisted and get its width value
    if (ec_field_whitelist[obType] == null) {
        return '';
    }
    else if (ec_field_whitelist[obType][fieldMeta.attr('name')] == null) {
        return '';
    }
        else {
            fieldSize = parseInt(parseFloat(ec_field_whitelist[obType][fieldMeta.attr('name')]) * 12);
        }
    
    fieldLabel = fieldMeta.attr('label');
    if (fieldLabel.match(/ID$/g) != null) {
        fieldLabel = fieldLabel.replace(/ ID$/g, '');
    }
    
    switch (fieldMeta.attr('type')) {
            
            
            
        case 'picklist':
        case 'multipicklist':
            
            var isStateCode = (['StateCode', 'CountryCode', 'MailingStateCode', 'MailingCountryCode'].indexOf(fieldMeta.attr('name')) != -1 ? true : false);
            var picklistValues = picklistOptionsJSON[obType][fieldMeta.attr('name')];
            
            var selectProperties = (fieldMeta.attr('type') == 'multipicklist' ? 'multiple' : '');
            if (isStateCode) {
                picklistValues = fieldMeta.attr('picklistValues');
                
                var sel_html = '<div class="form-group col-md-' + fieldSize + (isRequired ? ' ec_required_field' : '') + (isSimple ? ' ec_simple_field' : '') + '"><label class="control-label">' + fieldLabel + '</label><select name="' + fieldMeta.attr('name') + '" class="form-control" ' + (readOnly == false ? '' : ' disabled="disabled"') + '><option value="--placeholder--" class="ec_select_placeholder">' + fieldLabel + '</option>';
                picklistValues.each(function (ob, key) {
                    if (ob.attr('active') == true) {
                        sel_html += '<option value="' + ob.attr('value') + '"' + (ob.attr('defaultValue') == true ? ' selected' : '') + ' class="ec_picklist_index_' + key + '"' + '>' + ob.attr('label') + '</option>';
                    }
                });
                sel_html += '</select><span class=""></span></div>';
                field_html = sel_html;
                
            }
            else if (typeof picklistValues != 'undefined') {
                
                var sel_html = '<div class="form-group col-md-' + fieldSize + (isRequired ? ' ec_required_field' : '') + (isSimple ? ' ec_simple_field' : '') + '"><label class="control-label">' + fieldLabel + '</label><select ' + selectProperties + ' name="' + fieldMeta.attr('name') + '" class="form-control form-picklist" ' + (readOnly == false ? '' : ' disabled="disabled"') + (isDependent == false ? '' : ' controllerName="'+controllerName+'"') + '><option value="--placeholder--" class="ec_select_placeholder">' + fieldLabel + '</option>';
                for (var i = 0; i < picklistValues.length; i++) {
                    var item = picklistValues[i].split('###');
                    sel_html += '<option value="' + item[1] + '" class="ec_picklist_index_' + i + '"' + (isDependent == false ? '' : ' style="display:none;"') + '>' + item[0] + '</option>';
                }
                sel_html += '</select><span class=""></span></div>';
                field_html = sel_html;
                
            }
            
            if (fieldMeta.attr('dependentPicklist')) {
                window.controllers[fieldMeta.attr('controllerName')] = fieldMeta;
                
            }
            
            
            
            
            break;
            
        case 'reference':
            // if this is a record type reference then make a drop-down instead of a lookup
            if (fieldMeta.attr('name') == 'RecordTypeId') {
                // if there are no record types available then there's no need to show the field since there are no options
                if (ec_recordTypes[obType].length > 0) {
                    
                    field_html += '<div class="form-group col-md-' + fieldSize + (isRequired ? ' ec_required_field' : '') + (isSimple ? ' ec_simple_field' : '') + '"><label class="control-label">' + fieldLabel + '</label><select name="' + fieldMeta.attr('name') + '" class="form-control" ' + (readOnly == false ? '' : ' disabled="disabled"') + ' onchange="updatePicklists(event)"><option value="--placeholder--" class="ec_select_placeholder">' + fieldLabel + '</option>';
                    for (var ii = 0; ii < ec_recordTypes[obType].length; ++ii) {
                        var rt = ec_recordTypes[obType][ii];
                        field_html += '<option value="' + rt.Id + '" ' + (ec_recordTypesDefault['Lead'] == rt.Id ? 'selected' : '') + '>' + rt.Name + '</option>';
                    }
                    field_html += '</select><span class=""></span></div>';
                }
            }
            else if (fieldMeta.attr('referenceTo.0') == 'Account') {
                field_html = '<div class="form-group col-md-' + fieldSize + (isRequired ? ' ec_required_field' : '') + (isSimple ? ' ec_simple_field' : '') + '"><label class="control-label">' + fieldLabel + '</label><div class="'+ (ec_disableAcctCreate == false ? 'input-group' : '')+ '"><input type="text" name="' + fieldMeta.attr('name') + '" placeholder="' + fieldLabel + '" class="form-control ec_lookup_field" ' + (readOnly == false ? '' : ' disabled="disabled"') + '/><span class="input-group-btn"><button style="' + (ec_disableAcctCreate == false ? '' : 'display:none;') + '" type="button" class="btn btn-default ec_btn_create_record" value="' + accountNewURL + '">' + T.convert('42') + '</button></span></div><span class="ec_feedback_w_newbtn"></span>' + (readOnly == false ? '<input type="hidden" class="ec_lookup_field_val" name="' + fieldMeta.attr('name') + '" /><input type="hidden" class="ec_lookup_field_reftype" value="' + fieldMeta.attr('referenceTo.0') + '" />' : '') + '</div>';
            }
                else {
                    field_html = '<div class="form-group col-md-' + fieldSize + (isRequired ? ' ec_required_field' : '') + (isSimple ? ' ec_simple_field' : '') + '"><label class="control-label">' + fieldLabel + '</label><input type="text" name="' + fieldMeta.attr('name') + '" placeholder="' + fieldLabel + '" class="form-control ec_lookup_field" ' + (readOnly == false ? '' : ' disabled="disabled"') + '/><span class=""></span>' + (readOnly == false ? '<input type="hidden" class="ec_lookup_field_val" name="' + fieldMeta.attr('name') + '" /><input type="hidden" class="ec_lookup_field_reftype" value="' + fieldMeta.attr('referenceTo.0') + '" />' : '') + '</div>';
                }
            break;
        case 'date':
            var placeholder = fieldLabel + (ec_val_formats['date'] != null ? ' (ex: ' + ec_val_formats['date'] + ')' : '');
            field_html = '<div class="form-group col-md-' + fieldSize + (isRequired ? ' ec_required_field' : '') + (isSimple ? ' ec_simple_field' : '') + '"><label class="control-label">' + fieldLabel + '</label><input type="date" name="' + fieldMeta.attr('name') + '" placeholder="' + placeholder + '" class="form-control ec_datefield" ' + (readOnly == false ? '' : ' disabled="disabled"') + '/><span class=""></span></div>';
            break;
        case 'boolean':
            field_html = '<div class="form-group col-md-' + fieldSize + (isRequired ? ' ec_required_field' : '') + (isSimple ? ' ec_simple_field' : '') + ' ec_fieldtype_boolean"><label class="control-label">' + fieldLabel + '</label><input type="checkbox" name="' + fieldMeta.attr('name') + '" placeholder="' + fieldLabel + '" class="form-control ec_fieldtype_boolean" ' + (readOnly == false ? '' : ' disabled="disabled"') + '/><span class=""></span></div>';
            break;
        case 'textarea':
            field_html = '<div class="form-group col-md-' + fieldSize + (isRequired ? ' ec_required_field' : '') + (isSimple ? ' ec_simple_field' : '') + '"><label class="control-label">' + fieldLabel + '</label><textarea name="' + fieldMeta.attr('name') + '" placeholder="' + fieldLabel + '" class="form-control ec_fieldtype_' + fieldMeta.attr('type') + '" ' + (readOnly == false ? '' : ' disabled="disabled"') + ' rows="3" maxlength="' + fieldMeta.attr('length') + '"></textarea><span class=""></span></div>';
            break;
        default:
            /* Commented if statement adds duplicate search email button. Future feature 
            if(fieldMeta.attr('name')=='Email'){
                field_html = '<div class="form-group col-md-' + fieldSize + (isRequired ? ' ec_required_field' : '') + (isSimple ? ' ec_simple_field' : '') + '"><label class="control-label">' + fieldLabel + '</label><div class="input-group"><input type="text" name="' + fieldMeta.attr('name') + '" placeholder="' + fieldLabel + '" class="form-control ec_fieldtype_' + fieldMeta.attr('type') + '" ' + (readOnly == false ? '' : ' disabled="disabled"') + '/><span class="input-group-btn" title="' + T.convert('248') + '"><button id="ec_'+obType+'_dupe_search_btn" type="button" obUniverse="'+ obType + '" class="btn btn-default ec_btn_dupe_search" value="">&#x1F50E;</button></span></div><span class=""></span></div>';
            }
            else {
                field_html = '<div class="form-group col-md-' + fieldSize + (isRequired ? ' ec_required_field' : '') + (isSimple ? ' ec_simple_field' : '') + '"><label class="control-label">' + fieldLabel + '</label><input type="text" name="' + fieldMeta.attr('name') + '" placeholder="' + fieldLabel + '" class="form-control ec_fieldtype_' + fieldMeta.attr('type') + '" ' + (readOnly == false ? '' : ' disabled="disabled"') + '/><span class=""></span></div>';
            }
            */
            field_html = '<div class="form-group col-md-' + fieldSize + (isRequired ? ' ec_required_field' : '') + (isSimple ? ' ec_simple_field' : '') + '"><label class="control-label">' + fieldLabel + '</label><input type="text" name="' + fieldMeta.attr('name') + '" placeholder="' + fieldLabel + '" class="form-control ec_fieldtype_' + fieldMeta.attr('type') + '" ' + (readOnly == false ? '' : ' disabled="disabled"') + '/><span class=""></span></div>';

            break;
    }
    
    return field_html;
}

/*
 * Find and cache dependent values for state and country picklists
 */
function ec_findDependentValues(index) {
    var ret = [];
    
    // check the cache for the values first
    if (typeof ec_cspicklist_dep_cache[index] !== 'undefined') {
        ret = ec_cspicklist_dep_cache[index];
    }
    else {
        // values weren't in the cache so loop through and get them
        var stateList = ec_obDesc.attr('Lead.StateCode.picklistValues');
        if (stateList == null) {
            stateList = ec_obDesc.attr('Contact.MailingStateCode.picklistValues');
        }
        stateList.each(function (ob, key) {
            
            if (ec_isDependentValue(index, ob.attr('validFor'))) {
                ret.push(ob.attr());
            }
        });
        
        // update the cache
        ec_cspicklist_dep_cache[index] = ret;
    }
    
    return ret;
}

function ec_isDependentValue(index, validFor) {
    var base64 = new sforce.Base64Binary("");
    var decoded = base64.decode(validFor);
    var bits = decoded.charCodeAt(index >> 3);
    return ((bits & (0x80 >> (index % 8))) !== 0);
}

/*
 * Validate the data provided by the user in the forms
 * 
 * @param string The record type (lead, contact, etc.)
 * @param mixed This is passed through to the jQuery constructor object. It can either be a string selector or a jQuery object
 * @return Object An object containing the new records field values. If validation errors occur, the 'errors' property will have an array of error messages 
 * 				  and the 'bad_fields' property will contain the names of the fields that failed validation
 */
function ec_validate_form(obType, formContainer) {
    var ob_data = {};
    var form = $(formContainer);
    
    if (obType == null || obType == '' || formContainer == null || formContainer == '') {
        ob_data.errors = [T.convert('43') + '. ' + T.convert('44') + '.'];
        return ob_data;
    }
    
    // put field values into an object
    form.find('input, select, textarea').not('.ec_lookup_field_val, .ec_lookup_field_reftype').each(function (key, ob) {
        var jOb = $(ob);
        var val = jOb.val();
        if (jOb.hasClass('ec_lookup_field')) {
            val = jOb.parents('.form-group').children('.ec_lookup_field_val').val();
        }
        else if (jOb.hasClass('ec_fieldtype_boolean')) {
            val = (jOb.prop('checked') == true ? true : false);
        }
        
            else if (jOb.hasClass('ec_datefield')) {
                
                var date = new Date(jOb.val());
                date.setDate(date.getDate() + 1)
                var formattedDate = ('0' + date.getDate()).slice(-2);
                var formattedMonth = ('0' + (date.getMonth() + 1)).slice(-2);
                var formattedYear = date.getFullYear().toString().substr(2, 2);
                if (formattedDate == 'aN' || formattedMonth == 'aN' || formattedYear == 'aN') {
                    date = new Date();
                    formattedDate = ('0' + date.getDate()).slice(-2);
                    formattedMonth = ('0' + (date.getMonth() + 1)).slice(-2);
                    formattedYear = date.getFullYear().toString().substr(2, 2);
                }
                if (locale == 'en_GB') {
                    val = formattedDate + '/' + formattedMonth + '/' + formattedYear;
                }
                else if(locale == 'fr_CH'||locale=='hy_AM'||locale=='az_AZ'||locale=='de_DE'||locale=='de_DE_EURO'){
                    var fullYear = date.getFullYear().toString();
                    val = formattedDate +'.'+formattedMonth+'.'+fullYear;
                }
                else if(locale=='sq_AL'){
                    var fullYear = date.getFullYear().toString();
                    val = fullYear+'-'+ formattedMonth + '-'+  formattedDate;
                }
                else if(locale=='ar_DZ'){
                    var fullYear = date.getFullYear().toString();
                    val = formattedDate +'/'+formattedMonth+'/'+fullYear;
                }
                else if(locale=='nl_NL'){
                    var fullYear = date.getFullYear().toString();
                    val = formattedDate +'-'+formattedMonth+'-'+fullYear;
                }
                else {
                    val = formattedMonth + '/' + formattedDate + '/' + formattedYear;
                }
            }
        
        // if a value was set, use it
        if (val !== '' && val != '--placeholder--') {
            
            if (Array.isArray(val)) {
                val = val.join(';');
            }
            
            ob_data[jOb.attr('name')] = val;
        }
        // if no value was given and the field is required, set an error message and indicate the problem field
        else if (jOb.parents('.form-group').hasClass('ec_required_field') == true) {
            if (ob_data.bad_fields == null) {
                ob_data.bad_fields = [];
            }
            ob_data.bad_fields.push(jOb.attr('name'));
            
            // we only need to add this message once
            if (ob_data.bad_fields.length == 1) {
                if (ob_data.errors == null) {
                    ob_data.errors = [];
                }
                ob_data.errors.push(T.convert('45') + '.');
            }
        }
    });
    
    return ob_data;
}

/*
 * Send form data to the controller to create a record
 * 
 * @param String	The record type (lead, contact, etc.)
 * @param String	The ID of the record
 * @param function	A callback function to handle success. It can receive an array of new records as a parameter
 * @param function	A callback function to handle failure. It can receive an array of errors and an object 
 *					containing duplicate records as parameters
 * @param Object	An object containing any additional options such as 'dupeCheck' for skipping duplicate checking
 */
function ec_save_record(type, qId, success, failure, options) {
    var q = $("div[id^='" + qId + "-']");
    var form = $('#ec_' + type + 'form_' + qId);
    var ob_data = ec_validate_form(type, form);
    
    if (typeof options === "undefined" || options == null) {
        options = {};
    }
    
    // clear validation issues
    form.find('.form-control-feedback').removeClass('glyphicon glyphicon-remove form-control-feedback').parent().removeClass('has-error has-feedback');
    
    // if validation fails...
    if (ob_data.errors != null) {
        // if specific fields are identified, tell the user
        if (ob_data.bad_fields != null) {
            for (var key in ob_data.bad_fields) {
                form.find('[name="' + ob_data.bad_fields[key] + '"]').parent().addClass('has-error has-feedback').children('span').addClass('glyphicon glyphicon-remove form-control-feedback');
            }
        }
        
        // call failure function and return
        failure(ob_data.errors);
        return;
    }
    
    ob_data.qId = qId;
    if (options.dupeCheck == false) {
        ob_data.dupeCheck = false;
    }
    if (options.doMerge == true) {
        ob_data.doMerge = true;
    }
    
    
    // send remoting request to controller
    var req_ob = {};
    req_ob[type] = [ob_data];
    eContacts.Queue_Controller.saveRecords(JSON.stringify(req_ob), function (result, event) {
        if (event.status && result.errors.length == 0 && result.records != null && (result.dupes == null || result.dupes.length == 0)) {
            // update the queue object with lead info
            var idparts = q.attr('id').split('-');
            ec_queueItems.attr(idparts[1] + '.NewRecord', new can.Map({
                Id: (result.records[0].Id == null ? '' : result.records[0].Id.substring(0, 15)),
                FirstName: (result.records[0].FirstName == null ? '' : result.records[0].FirstName),
                LastName: (result.records[0].LastName == null ? '' : result.records[0].LastName),
                Company: (result.records[0].Company == null ? '' : result.records[0].Company),
                Title: (result.records[0].Title == null ? '' : result.records[0].Title)
            }));
            ec_queueItems.attr(idparts[1] + '.eContacts__Processed__c', true);
            
            // call success callback
            if (success != null) {
                success(result.records);
            }
        }
        else {
            // call failure callback
            if (failure != null) {
                var errors = (result == null || result.errors == null ? [] : result.errors);
                var dupes = (result == null || result.dupes == null ? {} : result.dupes);
                failure(errors, dupes);
            }
        }
        
        // refresh the tier data
        ec_refreshTierData();
    });
}

/*
 * Get the latest tier data and update the app
 */
function ec_refreshTierData() {
    eContacts.Queue_Controller.getTierData(function (result, event) {
        if (event.status) {
            if (result != null) {
                result.Processing_Cap = parseInt(result.Processing_Cap);
                result.Records_Processed = parseInt(result.Records_Processed);
                result.Ignore_Processing_Cap = (result.Ignore_Processing_Cap == 'true' ? true : false);
                result.OCR_Enabled = (result.OCR_Enabled == 'true' ? true : false);
                var tierData = new can.Map(result);
                tierData.each(function (value, key) {
                    eContacts_app.attr('tierData.' + key, value);
                });
            }
        }
    });
}

/*
 * Send request to the controller to delete a record
 * 
 * @param string The ID of the record
 * @param function A callback function to handle success. It can receive an array of new records as a parameter
 * @param function A callback function to handle failure. It can receive an array of errors as a parameter
 */
function ec_delete_record(qId, success, failure) {
    if (qId == null || qId == '') {
        failure([T.convert('46') + '. ' + T.convert('44') + '.']);
        return;
    }
    
    // send the delete request to the controller
    eContacts.Queue_Controller.deleteRecords([qId], function (result, event) {
        if (event.status && result.errors.length == 0 && result.records != null) {
            // call success callback
            if (success != null) {
                success(result.records);
            }
        }
        else {
            // call failure callback
            if (failure != null) {
                failure((result == null || result.errors == null ? [] : result.errors));
            }
        }
    });
}

/*
 * Fetch a batch of queue items
 * 
 * @param integer The number of results to fetch
 */
function ec_fetch_records(qty, isInitialLoad) {
    
    if (qty == null || qty < 1 || ec_pause_iscroll == true) {
        
        return;
    }
    
    if (typeof isInitialLoad == 'undefined') {
        isInitialLoad = false;
    }
    
    // ignore infinite scroll requests while processing one
    ec_pause_iscroll = true;
    
    // update UI to indicate more results being loaded
    $('#ec_noitems').fadeOut(300, function () {
        $('#ec_loading_items').fadeIn();
        //
        var ops = {
            ownedOnly: eContacts_app.attr('myCardsOnly'),
            userList: $("#userFilterOptions").chosen().val().join()
            
        };
        
        
        // determine the queue number of the last card that was loaded
        var lastQueueNum = null;
        if (eContacts_app.attr('singleCardMode')) {
            lastQueueNum = parseInt(URLvars.card);
            
            var ops = {
                cardNum: lastQueueNum
            };
            
            qty = 1;
        }
        else {
            lastQueueNum = parseInt(ec_queueItems.attr((ec_queueItems.length - 1) + '.Name') || 999999999);
        }
        
        if (isInitialLoad) {
            lastQueueNum = 999999999;
        }
        
        eContacts.Queue_Controller.getQueueItems(0, parseInt(qty), lastQueueNum, JSON.stringify(ops), function (result, event) {
            if (event.status && result != null) {
                ec_bundleIds = { images: {}, tasks: {}, signatures: {} }
                
                if (result.length > 0) {
                    
                    $.each(result, function (k, v) {
                        if (typeof v['eContacts__Bundle__c'] != 'undefined') {
                            ec_bundleIds.images[v['eContacts__Bundle__c']] = v['eContacts__Bundle__c'];
                            ec_bundleIds.tasks[v['eContacts__Bundle__c']] = false;
                            ec_bundleIds.signatures[v['eContacts__Bundle__c']] = v['eContacts__Bundle__c'];

                        }
                        
                    });
                    if (!jQuery.isEmptyObject(ec_bundleIds.images)) {
                        
                        
                        resultBundles = sforce.connection.query("Select Id,eContacts__Secondary_Image__c,eContacts__Bundle__c FROM eContacts__Queue_Item__c WHERE eContacts__Processed__c = false AND eContacts__type__c = 'secondCard' AND eContacts__Bundle__c IN ('" + Object.keys(ec_bundleIds.images).join("','") + "')");
                        $.each(resultBundles.getArray("records"), function (k, v) {
                            ec_bundleIds.images[v['eContacts__Bundle__c']] = v;
                        });
                        
                    }
                    if (!jQuery.isEmptyObject(ec_bundleIds.signatures)) {
                        
                        
                        resultBundles = sforce.connection.query("Select Id,eContacts__Secondary_Image__c,eContacts__Bundle__c FROM eContacts__Queue_Item__c WHERE eContacts__Processed__c = false AND eContacts__type__c = 'signature' AND eContacts__Bundle__c IN ('" + Object.keys(ec_bundleIds.signatures).join("','") + "')");
                        $.each(resultBundles.getArray("records"), function (k, v) {
                            ec_bundleIds.signatures[v['eContacts__Bundle__c']] = v;
                        });
                        
                    }
                    if (!jQuery.isEmptyObject(ec_bundleIds.tasks)) {
                        
                        
                        resultBundles = sforce.connection.query("Select Id,eContacts__Bundle__c FROM Task WHERE eContacts__Bundle__c IN ('" + Object.keys(ec_bundleIds.tasks).join("','") + "')");
                        $.each(resultBundles.getArray("records"), function (k, v) {
                            ec_bundleIds.tasks[v['eContacts__Bundle__c']] = v;
                        });
                        
                    }
                    
                    
                    // add to queue item list
                    ec_queueItems.push.apply(ec_queueItems, result);
                    $('#ec_loading_items').fadeOut(function () {
                        ec_pause_iscroll = false;
                    });
                }
                else if (result.length == 0 && eContacts_app.attr('singleCardMode') == true) {
                    $('#ec_loading_items').fadeOut(300, function () {
                        $('#ec_card_not_found').fadeIn();
                    });
                }
                
                
                    else if (result.length == 0) {
                        if (eContacts_app.attr('pendingCount') > 0) {
                            $('#ec_loading_items').fadeOut(function () {
                                $('#ec_noitems').fadeIn(300, function () {
                                    setTimeout(function () {
                                        ec_pause_iscroll = false;
                                        $('#ec_noitems').slideUp(200, function () {
                                            setTimeout(function () { ec_pause_iscroll = false; }, 100);
                                        });
                                    }, 1000);
                                });
                            });
                        }
                        else {
                            $('#ec_loading_items').fadeOut(function () {
                                $('#ec_noitems').fadeIn(300, function () {
                                    ec_pause_iscroll = false;
                                });
                            });
                        }
                    }
            }
            else {
                // notify user that there was an error getting results
                new PNotify({
                    title: T.convert('48'),
                    text: T.convert('49') + '. ' + T.convert('44') + '.',
                    type: 'error'
                });
                $('#ec_loading_items').fadeOut(function () {
                    ec_pause_iscroll = false;
                });
            }
            
        },
                                                 { escape: false });
    });
}

/*
 * Utility function to help make date strings into something more usable in the UI
 * 
 * @param string The date represented as a string to be passed to the Date() function
 * @return Object An object containing the Date object and some strings that are useful for passing to the UI
 */
function ec_datestr_to_ob(datestring) {
    var date = new Date(datestring);
    var hours = date.getHours();
    var ampm = 'AM';
    var minutes = date.getMinutes();
    if (hours > 11) {
        if (hours != 12) {
            hours -= 12;
        }
        
        ampm = 'PM';
    }
    if (minutes < 10) {
        minutes = '0' + minutes;
    }
    
    return {
        date: date,
        month: date.getMonth() + 1,
        day: date.getDate(),
        year: date.getFullYear(),
        hours: hours,
        minutes: minutes,
        ampm: ampm
    };
}

// register a simple helper function with mustache to make formatting dates easier
can.Mustache.registerHelper('formatDate', function (datestring) {
    var dateob = ec_datestr_to_ob(datestring());
    
    return dateob.month + '/' + dateob.day + '/' + dateob.year + ' ' + dateob.hours + ':' + dateob.minutes + ' ' + dateob.ampm;
});

// register a simple helper function with mustache to make formatting dates easier
can.Mustache.registerHelper('loading_img', function () {
    return ec_loading_img;
});

/*
 * Takes a string and strips any html found in it, encoded or not
 */
function ec_stripHTML(rawStr) {
    var outStr = '';
    
    if (rawStr != '') {
        // decode html in the string
        if (decodeURI != null) {
            outStr = decodeURI(rawStr);
        }
        else if (unescape != null) {
            outStr = unescape(rawStr);
        }
        outStr = outStr.replace(/&lt;/gim, '<').replace(/&gt;/gim, '>').replace(/&quot;/gim, '"');
        
        // remove all html tags and their content
        outDOM = $('<div></div>').html(outStr);
        outDOM.find('script, style').remove();
        outStr = outDOM.text();
    }
    
    return outStr;
}

function createNewAccount(qItem, recordTypeId) {
    var url = accountNewURL;
    
    var queueNum = qItem.attr('id').split('-')[1];
    var ocr = ec_queueItems.attr(queueNum + '.ocr') || null;
    
    var params = [];
    
    qItem = qItem.find('.active');
    
    params.push('name_firstacc2=' + encodeURIComponent(qItem.find('[name=FirstName]').val()));
    params.push('name_lastacc2=' + encodeURIComponent(qItem.find('[name=LastName]').val()));
    
    if (qItem.find('[name=Phone]').val() == undefined) {
        params.push('acc10=' + encodeURIComponent(qItem.find('[name=MobilePhone]').val()));
    }
    else {
        params.push('acc10=' + encodeURIComponent(qItem.find('[name=Phone]').val()));
    }
    
    params.push('acc20=' + encodeURIComponent(qItem.find('[name=Description]').val()));
    
    params.push('acc11=' + encodeURIComponent(qItem.find('[name=Fax]').val()));
    params.push('PersonTitle=' + encodeURIComponent(qItem.find('[name=Title]').val()));
    params.push('PersonEmail=' + encodeURIComponent(qItem.find('[name=Email]').val()));
    
    params.push('PersonMobilePhone=' + encodeURIComponent(qItem.find('[name=MobilePhone]').val()));
    
    
    if (qItem.find('[name=Company]').val() != undefined) {
        
        params.push('acc2=' + encodeURIComponent(qItem.find('[name=Company]').val()));
        
    }
    params.push('acc12=' + encodeURIComponent(qItem.find('[name=Website]').val()));
    params.push('acc17street=' + encodeURIComponent(qItem.find('[name=MailingStreet]').val()));
    params.push('acc18street=' + encodeURIComponent(qItem.find('[name=MailingStreet]').val()));
    params.push('acc17city=' + encodeURIComponent(qItem.find('[name=MailingCity]').val()));
    params.push('acc18city=' + encodeURIComponent(qItem.find('[name=MailingCity]').val()));
    params.push('acc17zip=' + encodeURIComponent(qItem.find('[name=MailingPostalCode]').val()));
    params.push('acc18zip=' + encodeURIComponent(qItem.find('[name=MailingPostalCode]').val()));
    
    // look at the OCR values and see what can be filled out on the account
    
    
    if (ocr != null) {
        
        
        
        if (ocr['company'] && ocr['company'].length > 0) {
            params.push('acc2=' + encodeURIComponent(ocr['company'][0]));
            
        }
        
        if (ocr['address_country'] && ocr['address_country'].length < 1) {
            ocr['address_country'].push(defaultCountry);
        }
        
        if (ocr['address_country'] && ocr['address_country'].length > 0) {
            var val = encodeURIComponent(ocr['address_country'][0]);
            
            // if country/state picklists are not enabled, use the plain text fields directly
            if (ec_cs_picklists == false) {
                params.push('acc17country=' + val);
                params.push('acc18country=' + val);
            }
            // otherwise, try to find the ocr value in the state/country code dropdowns instead
            else {
                var selects = qItem.find('select[name=CountryCode], select[name=MailingCountryCode]').first().clone();
                var op = (val == null || val == '' ? $() : selects.find('option[value=' + val + ']'));
                
                // if we couldn't find the exact text as a value...
                if (op.size() == 0) {
                    // check each option to see if the body text matches (case insensitive)
                    selects.find('option').each(function (index, el) {
                        var regex = new RegExp('^' + val + '$', 'i');
                        var el_ob = $(this);
                        
                        // if the text matches, select that option and trigger the change event
                        if (regex.test(el_ob.text())) {
                            selects.val(el_ob.val());
                            return false;	// now that we know which option matches we can stop the looping
                        }
                    });
                }
                // otherwise, we can just select the right option by value
                else {
                    selects.val(val);
                }
                
                // the option that is now selected contains the value we need
                var selected_option = selects.find('option:selected').val();
                if (selected_option != null) {
                    params.push('acc17country=' + selected_option);
                    params.push('acc18country=' + selected_option);
                }
            }
        }
        if (ocr['address_state'] && ocr['address_state'].length > 0) {
            var val = encodeURIComponent(ocr['address_state'][0]);
            
            // if country/state picklists are not enabled, use the plain text fields directly
            if (ec_cs_picklists == false) {
                params.push('acc17state=' + val);
                params.push('acc18state=' + val);
            }
            // otherwise, try to find the ocr value in the state/country code dropdowns instead
            else {
                var selects = qItem.find('select[name=StateCode], select[name=MailingStateCode]').first().clone();
                
                var op = (val == null || val == '' ? $() : selects.find('option[value="' + val + '"]'));
                
                
                // if we couldn't find the exact text as a value...
                if (op.size() == 0) {
                    // check each option to see if the body text matches (case insensitive)
                    selects.find('option').each(function (index, el) {
                        var regex = new RegExp('^' + val + '$', 'i');
                        
                        var el_ob = $(this);
                        
                        // if the text matches, select that option and trigger the change event
                        if (regex.test(el_ob.text())) {
                            selects.val(el_ob.val());
                            return false;	// now that we know which option matches we can stop the looping
                        }
                    });
                }
                // otherwise, we can just select the right option by value
                else {
                    selects.val(val);
                }
                
                // the option that is now selected contains the value we need
                var selected_option = selects.find('option:selected').val();
                if (selected_option != null) {
                    params.push('acc17state=' + selected_option);
                    params.push('acc18state=' + selected_option);
                }
            }
        }
        
        
        
        
    }
    
    if (typeof recordTypeId != 'undefined') {
        params.push('RecordType=' + recordTypeId);
    }
    
    if (params.length > 0) {
        url += '?' + params.join('&');
        url = url.replace(/undefined/g, "");
    }
    
    if (detectmob()) {
        //url = '/one/one.app#/sObject/Account/new?recordTypeId=' + recordTypeId;
    }
    
    window.open(url, '_blank');
    
}

/*
 * Bind event handlers to queue item components
 */
function ec_bindQueueBtns(root) {
    if (root == null) {
        root = $('#ec_page_process');
    }
    
    // bind click handlers to queue form submission buttons
    root.find("button[id^='ec_btn_save_lead']").click(function () {
        var btnRef = $(this);
        
        if (btnRef.attr('disabled') == null) {
            btnRef.attr('disabled', 'disabled');
            btnRef.children('.ec_loading_img').show();
            var qId = btnRef.val();
            var q = ec_queueItems.attr($("div[id^='" + qId + "']").attr('id').split('-')[1]);
            var success = function (records) {
                $('#ec_dialog_confirmation').modal('hide');
                new PNotify({
                    title: T.convert('51', [ec_leadLabel]),
                    text: T.convert('52', [ec_leadLabel]) + '.',
                    type: 'success'
                });
                btnRef.removeAttr('disabled');
                btnRef.children('.ec_loading_img').hide();
                
                // if they reached their limit, obscure the remaining images
                if (eContacts_app.attr('tierData.Processing_Cap') - eContacts_app.attr('tierData.Records_Processed') == 0) {
                    $('#ec_page_process .ec_bcard').addClass('ec_obscure');
                }
            };
            var error = function (errors, dupes) {
                $('#ec_dialog_confirmation').modal('hide');
                if (errors.length > 0) {
                    for (var ii = 0; ii < errors.length; ++ii) {
                        new PNotify({
                            title: T.convert('53', [ec_leadLabel]),
                            text: ec_stripHTML(errors[ii]),
                            type: 'error'
                        });
                    }
                }
                else if (dupes != null && dupes[qId] != null && dupes[qId].length > 0) {
                    new PNotify({
                        title: T.convert('54', [ec_leadLabel]) + ' ' + q.attr('Name'),
                        text: 'What would you like to do?',
                        hide: false,
                        confirm: {
                            confirm: true,
                            buttons: [
                                {
                                    text: 'View',
                                    addClass: 'btn-info',
                                    click: function (notice) {
                                        window.open(ec_baseURL + '/' + dupes[qId][0].Id);
                                    }
                                },
                                {
                                    text: 'Merge',
                                    addClass: 'btn-success',
                                    click: function (notice) {
                                        notice.remove();
                                        // try to save again but ignore the dupe checking
                                        ec_save_record('lead', qId, success, error, { doMerge: true });
                                    }
                                },
                                {
                                    text: 'Create Duplicate',
                                    addClass: 'btn-success',
                                    click: function (notice) {
                                        notice.remove();
                                        // try to save again but ignore the dupe checking
                                        ec_save_record('lead', qId, success, error, { dupeCheck: false });
                                    }
                                }
                            ]
                        },
                        buttons: { closer: true },
                        width: '92vw',
                        addclass: 'bootstrap-styles ec_notify_dupe',
                        before_open: function (notice) {
                            notice.get().find('button.undefined').remove();
                            notice.get().find('button.btn-danger').before('<a href="' + ec_baseURL + '/' + dupes[qId][0].Id + '" target="_blank">' + T.convert('56') + '</a>')
                            .parent().addClass('ec_notify_footer');
                        }
                    });
                }
                    else {
                        new PNotify({
                            title: T.convert('57', [ec_leadLabel]),
                            text: T.convert('58', [ec_leadLabel]) + '. ' + T.convert('44') + '.',
                            type: 'error'
                        });
                    }
                
                btnRef.removeAttr('disabled');
                btnRef.children('.ec_loading_img').hide();
            };
            
            // create lead
            ec_save_record('lead', qId, success, error);
        }
    });
    root.find("button[id^='ec_btn_save_contact']").click(function () {
        var btnRef = $(this);
        
        if (btnRef.attr('disabled') != 'disabled') {
            btnRef.attr('disabled', 'disabled');
            btnRef.children('.ec_loading_img').show();
            var qId = btnRef.val();
            var q = ec_queueItems.attr($("div[id^='" + qId + "']").attr('id').split('-')[1]);
            var success = function (records) {
                $('#ec_dialog_confirmation').modal('hide');
                new PNotify({
                    title: T.convert('60', [ec_contactLabel]),
                    text: T.convert('61', [ec_contactLabel]) + '.',
                    type: 'success'
                });
                
                btnRef.removeAttr('disabled');
                
                // if they reached their limit, obscure the remaining images
                if (eContacts_app.attr('tierData.Processing_Cap') - eContacts_app.attr('tierData.Records_Processed') == 0) {
                    $('#ec_page_process .ec_bcard').addClass('ec_obscure');
                }
            };
            var error = function (errors, dupes) {
                $('#ec_dialog_confirmation').modal('hide');
                if (errors.length > 0) {
                    for (var ii = 0; ii < errors.length; ++ii) {
                        new PNotify({
                            title: T.convert('67', [ec_contactLabel]),
                            text: ec_stripHTML(errors[ii]),
                            type: 'error'
                        });
                    }
                }
                else if (dupes != null && dupes[qId] != null && dupes[qId].length > 0) {
                    new PNotify({
                        title: T.convert('62', [ec_contactLabel]) + ' ' + q.attr('Name'),
                        text: 'What would you like to do?',
                        hide: false,
                        confirm: {
                            confirm: true,
                            buttons: [
                                {
                                    text: 'View',
                                    addClass: 'btn-info',
                                    click: function (notice) {
                                        window.open(ec_baseURL + '/' + dupes[qId][0].Id);
                                    }
                                },
                                {
                                    text: 'Merge',
                                    addClass: 'btn-success',
                                    click: function (notice) {
                                        notice.remove();
                                        // try to save again but ignore the dupe checking
                                        ec_save_record('contact', qId, success, error, { doMerge: true });
                                    }
                                },
                                {
                                    text: 'Create Duplicate',
                                    addClass: 'btn-success',
                                    click: function (notice) {
                                        notice.remove();
                                        // try to save again but ignore the dupe checking
                                        ec_save_record('contact', qId, success, error, { dupeCheck: false });
                                    }
                                }
                            ]
                        },
                        buttons: { closer: true },
                        width: '92vw',
                        addclass: 'bootstrap-styles ec_notify_dupe',
                        before_open: function (notice) {
                            notice.get().find('button.undefined').remove();
                            notice.get().find('button.btn-danger').before('<a href="' + ec_baseURL + '/' + dupes[qId][0].Id + '" target="_blank">' + T.convert('56') + '</a>')
                            .parent().addClass('ec_notify_footer');
                        }
                    });
                }
                    else {
                        new PNotify({
                            title: T.convert('67', [ec_contactLabel]),
                            text: T.convert('68', [ec_contactLabel]) + '. ' + T.convert('44') + '.',
                            type: 'error'
                        });
                    }
                
                btnRef.removeAttr('disabled');
                btnRef.children('.ec_loading_img').hide();
            };
            
            // create contact
            ec_save_record('contact', qId, success, error);
        }
    });
    
    // bind click function to delete buttons
    root.find('.ec_qbtn_delete').click(function () {
        var x = $(this).parent().parent().attr('id');
        
        if (typeof x == 'undefined' || x == '') {
            x = $(this).parent().parent().parent().attr('id');
        }
        
        
        $('#ec_dialog_delete button.ec_btn_delete').val(x);
        $('#ec_dialog_delete').modal('show');
    });
    
    // bind click function to resubmit buttons
    root.find('.ec_qbtn_resubmit').click(function () {
        
        //init variables
        var panel = $(this).closest('.panel-primary');
        let panel_text = panel.find('.panel-heading h3').text();
        var id = panel.attr('id');
        let sid = sforce.connection.sessionId;
        let rid = ''; // TODO need to make dynamic
        let image = $(this).closest('.ec_left_container').find('.ec_image_container > img');
        let image_b64 = image.attr('src').split(',')[1];
        let notes_text = $(this).closest('.row').find('.ec_right_col textarea[name=Description]').val();
        let notes = "Resubmitted from " + panel_text + "\n" + notes_text;
        let lang = $(this).closest('.ec_left_container').find('input[name="language"]').val(); 
        let type = 'businessCard';
        
        // request structure: 
        let params = {
            "base64": image_b64,
            "paramJSON": JSON.stringify({
                "address": "",
                "lat": 0.00,
                "lng": 0.00,
                "rid": rid,
                "sid": sid,
                "notes": notes,
                "type": type,
                "language": lang
            })
        };
		
        // init settings
        var settings = {
            "async": true,
            "url": UserContext.salesforceURL + "/services/apexrest/eContacts/FeedQueueItem/",
            "method": "POST",
            "headers": {
                "Authorization": "Bearer " + sid,
                "Content-Type": "application/json",
                "cache-control": "no-cache",
            },
            "processData": false,
            "data": JSON.stringify(params),
            "success": function(){location.reload();}
        }

        $.ajax(settings).done(function (response) {
          console.log(response);
        });
        
    });
    
    // bind click function to Add to Address Book buttons
    root.find('.ec_btn_createVCF').click(function(e) { 
        //init variables
        var panel = $(this).closest('.panel-primary');
        var isLead = true;
        if(panel.find('.tab-pane.active').attr('id').includes("contactform")){
            isLead= false;
        }
        //create vCard object
        var vCardObj = vCard.create(vCard.Version.THREE);
        vCardObj.add(vCard.Entry.NAME, panel.find('.ec_fieldtype_string[name="LastName"]')[0].value+';'+panel.find('.ec_fieldtype_string[name="FirstName"]')[0].value+';;');
        var formattedName = panel.find('.ec_fieldtype_string[name="FirstName"]')[0].value+' '+panel.find('.ec_fieldtype_string[name="LastName"]')[0].value;
        vCardObj.add(vCard.Entry.FORMATTEDNAME, formattedName);
        vCardObj.add(vCard.Entry.TITLE, panel.find('.ec_fieldtype_string[name="Title"]')[0].value);
        vCardObj.add(vCard.Entry.PHONE, panel.find('.ec_fieldtype_phone[name="Phone"]')[0].value, vCard.Type.WORK);
        vCardObj.add(vCard.Entry.PHONE, panel.find('.ec_fieldtype_phone[name="MobilePhone"]')[0].value, vCard.Type.CELL);
        vCardObj.add(vCard.Entry.PHONE, panel.find('.ec_fieldtype_phone[name="Fax"]')[0].value, vCard.Type.FAX);
        vCardObj.add(vCard.Entry.EMAIL, panel.find('.ec_fieldtype_email[name="Email"]')[0].value, vCard.Type.WORK);
        var org = isLead ? panel.find('.ec_fieldtype_string[name="Company"]')[0].value : panel.find('.ec_lookup_field[name="AccountId"]')[0].value;
        vCardObj.add(vCard.Entry.ORGANIZATION, org);
        var city = '';
        var postalCode = '';
        var country = '';
        var state = '';
        var street = '';
        if(isLead){
            street = panel.find('.ec_fieldtype_textarea[name="Street"]').val();
            city = panel.find('.ec_fieldtype_string[name="City"]').val();
            postalCode = panel.find('.ec_fieldtype_string[name="PostalCode"]').val();
            if(ec_cs_picklists){
                country = panel.find('select[name=CountryCode] option:selected').text();
                state = panel.find('select[name=StateCode] option:selected').text();
            }
            else{
                country = panel.find('.ec_fieldtype_string[name=Country]').val();
                state = panel.find('.ec_fieldtype_string[name=State]').val();
            }
            
        }
        else {
            street = panel.find('.ec_fieldtype_textarea[name="MailingStreet"]').val();
            city = panel.find('.ec_fieldtype_string[name="MailingCity"]').val();
            postalCode = panel.find('.ec_fieldtype_string[name="MailingPostalCode"]').val();
            if(ec_cs_picklists){
                country = panel.find('select[name=MailingCountryCode] option:selected').text();
                state = panel.find('select[name=MailingStateCode] option:selected').text();
            }
            else {
                country = panel.find('.ec_fieldtypestring[name=MailingCountry]').val();
                state = panel.find('.ec_fieldtypestring[name=MailingState]').val();
            }
        }
        
        var fullAddressStr = ";;" + street + ";" + city + ";" + state + ";" + postalCode + ";" + country;
        vCardObj.add(vCard.Entry.ADDRESS, fullAddressStr, vCard.Type.WORK);
        vCardObj.add(vCard.Entry.URL, isLead ? panel.find('.ec_fieldtype_url[name="Website"]')[0].value : panel.find('.ec_ocr_website').text(), vCard.Type.WORK);
        
        var link = vCard.export(vCardObj, formattedName, false);
       
        $(this).attr('href',link);
        $(this).attr('download',formattedName + '.vcf');
        //panel.find('.ec_btn_createVCF').click();
    });
    
    
    
    // if labels are not always on then when an input/select element has focus, show its label
    if (root.find('.ec_labels_on').size() == 0) {
        root.find('.ec_right_col .form-group').not('.ec_fieldtype_boolean').find('.form-control').focus(function () {
            $(this).prev().fadeIn();
        }).blur(function () {
            $(this).prev().fadeOut();
        });
    }
    
    // when a country picklist value is selected, update option visibility for states
    root.find("select[name='CountryCode'], select[name='MailingCountryCode']").change(function () {
        var country = $(this).val();
        var index;
        var classes = $(this).find('option:selected').attr('class');
        
        if (typeof classes == 'undefined') {
            return false;
        }
        
        classes = classes.split(" ");
        
        for (var classnum in classes) {
            if (classes.hasOwnProperty(classnum)) {
                var classname = classes[classnum];
                var matches = classname.match(/^ec_picklist_index_([0-9]+)$/);
                if (matches != null) {
                    index = matches[1];
                    break;
                }
            }
        }
        var stateMap = ec_obDesc.attr('Lead.StateCode');
        if (stateMap == null) {
            stateMap = ec_obDesc.attr('Contact.MailingStateCode');
        }
        var fieldMeta = new can.Map($.extend(true, {}, stateMap.attr()));
        fieldMeta.attr('picklistValues').attr(ec_findDependentValues(index), true);
        var fieldDOM = $('<div></div>').html(ec_getFieldHTML(fieldMeta, 'Lead'));
        if (typeof options != 'undefined') { }
        var options = fieldDOM.find('select').html();
        $(this).parents('.ec_right_col').find("select[name='StateCode'], select[name='MailingStateCode']").each(function (key, el) {
            var ob = $(this);
            var val = ob.find('option:selected').val();
            ob.html(options);
            if (typeof val != 'undefined' && val != null && ob.find('option[value=' + val + ']').size() > 0) {
                ob.val(val);
            }
            ob.trigger('change');
        });
    });
    
    // add placeholder functionality to select elements
    var setPlaceholderText = function (target) {
        if ($(target).val() == '--placeholder--') {
            $(target).addClass('ec_select_placeholder');
        }
        else {
            $(target).removeClass('ec_select_placeholder');
        }
    };
    root.find(".ec_right_col .form-group > select.form-control")
    .change(function () {
        setPlaceholderText(this);
    })
    .each(function () {
        setPlaceholderText(this);
    });
    
    // make lookup fields functional
    root.find('.ec_lookup_field').focus(function () {
        var type = $(this).parents('.form-group').children('.ec_lookup_field_reftype').val();
        // if type is group then this is a polymorphic reference so do the search on the user object
        if (type == 'Group') {
            type = 'User';
        }
        
        // open the lookup dialog
        ec_create_lookup_dialog(type, $(this));
    });
    
    // make new account button functional
    root.find('.ec_btn_create_record').click(function () {
        
        var qItem = $(this).parents('.ec_queue_item');
        if(ec_disableQuickCreate){
            ec_create_recordtype_dialog_classic(qItem)
        }
        else{
            ec_create_recordtype_dialog(qItem);
        }
        
    });
    
    // make dupe search button functional
    root.find('.ec_btn_dupe_search').click(function () {
       
        var panel = $(this).closest('.panel-primary');
        var id = panel.attr('id').substring(0,18);
        var universe = $(this).attr('obuniverse');
        var emailQueryVal = $(this).closest('div.input-group').find('input[name="Email"]').val();
        var query;
        
        //create sforce query string based on object type from panel-primary
        if(universe=='Lead' && emailQueryVal.trim() != ''){
            query = "SELECT Id, Email, Phone, Name, Company FROM Lead WHERE Email = '"+emailQueryVal+"'";
        }
        else if(universe=='Contact' && emailQueryVal.trim() != ''){
            query = "Select Id, Email, Phone, Name, Account.Name From Contact WHERE Email = '"+emailQueryVal+"'";
        }
        else {
            query = '';
        }
        if(query != ''){
            //query salesforce for duplicate records
            dupeQuery = sforce.connection.query(query);
            
            //assign returned records to array
            dupeRecords = dupeQuery.getArray('records');
        }
        else{
            dupeRecords = '';
        }
      
        //set modal container to dialog var
        var dialog = $('#ec_dialog_dupeSearch');
        //check if results found and set html of lookupDupesContainer appropriately
        if (dupeRecords.length < 1 ){
            $('#lookupDupesContainer').html('');
            $('#ec_noDupes_found').show();
        }
        else {
            $('#lookupDupesContainer').html('');
            $('#lookupDupesContainer').html(can.view('ec_tpl_lookupDupes', {dupeRecords : dupeRecords}));
            $('#ec_noDupes_found').hide();
        }
        emailQueryVal = '';
        dialog.modal('show');
        
    });
    
    //update dependent picklist when controlling picklist is changed
    root.find("select[controllingfield='true']").change(function () {
    	updateDependentPicklists(this);
    });
    
    // activate button to upgrade page
    root.find('.ec_btn-upgrade button').click(function () {
        window.open('http://www.visionecontacts.com/contact/index.php', '_blank');
    });
    
    // make ocr data available to the user
    root.find('.ec_right_col .form-group > input.form-control, .ec_right_col .form-group > textarea.form-control').not('.ec_lookup_field').focus(function () {
        var container = $(this).parents('.ec_right_col');
        
        // find position data of field
        var pos_field = this.getBoundingClientRect();
        var pos_container = container[0].getBoundingClientRect();
        var ocr_container = container.find('.ec_ocr_data');
        
        
        // show relevant options based on field data type
        var fieldName = $(this).attr('name');
        ocr_container.find('li').hide();
        if ($(this).hasClass('ec_fieldtype_email')) {
            ocr_container.find('.ec_ocr_email').show();
        }
        else if ($(this).hasClass('ec_fieldtype_phone')) {
            ocr_container.find('.ec_ocr_phone').show();
        }
            else if ($(this).hasClass('ec_fieldtype_url')) {
                ocr_container.find('.ec_ocr_website').show();
            }
                else if (fieldName == 'FirstName') {
                    ocr_container.find('.ec_ocr_firstname').show();
                }
                    else if (fieldName == 'LastName') {
                        ocr_container.find('.ec_ocr_lastname').show();
                    }
                        else if (fieldName == 'Title') {
                            ocr_container.find('.ec_ocr_title').show();
                        }
                            else if (fieldName == 'Company') {
                                ocr_container.find('.ec_ocr_company').show();
                            }
                                else if (fieldName == 'Street' || fieldName == 'MailingStreet' || fieldName == 'BillingStreet') {
                                    ocr_container.find('.ec_ocr_address_street').show();
                                }
                                    else if (fieldName == 'City' || fieldName == 'MailingCity' || fieldName == 'BillingCity') {
                                        ocr_container.find('.ec_ocr_address_city').show();
                                    }
                                        else if (fieldName == 'State' || fieldName == 'MailingState' || fieldName == 'BillingState') {
                                            ocr_container.find('.ec_ocr_address_state').show();
                                        }
                                            else if (fieldName == 'PostalCode' || fieldName == 'MailingPostalCode' || fieldName == 'BillingPostalCode') {
                                                ocr_container.find('.ec_ocr_address_zip').show();
                                            }
                                                else if (fieldName == 'Country' || fieldName == 'MailingCountry' || fieldName == 'BillingCountry') {
                                                    ocr_container.find('.ec_ocr_address_country').show();
                                                }
                                                    else if ($(this).hasClass('ec_fieldtype_string') || $(this).hasClass('ec_fieldtype_textarea')) {
                                                        ocr_container.find('.ec_ocr_firstname, .ec_ocr_lastname, .ec_ocr_title, .ec_ocr_email, .ec_ocr_address, .ec_ocr_misc').show();
                                                    }
        
        // set position of popup and unhide
        ocr_container.css({ top: pos_field.top - pos_container.top + $(this).outerHeight(), left: pos_field.left - pos_container.left }).stop().fadeIn()
        .attr('name', $(this).attr('name'));	// copy the field name so we can find the target element
    }).blur(function () {
        $(this).parents('.ec_right_col').find('.ec_ocr_data').fadeOut();
    });
    root.find('.ec_right_col .ec_ocr_data a').click(function (e) {
        e.preventDefault();
        
        var ocr_data = $(this).parents('.ec_ocr_data');
        ocr_data.prevAll('.active').find('.form-group > input.form-control[name=' + ocr_data.attr('name') + '], .form-group > textarea.form-control[name=' + ocr_data.attr('name') + ']').val($(this).text());
    });
    
    // bind mouseover functionality to card image for zooming
    // 
    // 
    // 
    
    root.find('.secondaryImage')
    .on('click', function (event) {
        ec_queue_image_thumbnailswap('small', $(this).parents('.ec_left_col'));
    });
    
    root.find('.ec_bcard')
    
    .on('click', function (event) {
        ec_queue_image_thumbnailswap('big', $(this).parents('.ec_left_col'));
    })
    
    
    // make placeholder text work for IE9
    root.find('input, textarea').placeholder();
}

function ec_queue_image_thumbnailswap(location, container) {
    var x = container.find('img.ec_bcard').attr('src');
    var y = container.find('img.secondaryImage').attr('src');
    
    if (location == 'small') {
        container.find('img.secondaryImage').attr('src', x);
        container.find('img.ec_bcard').attr('src', y);
        
        
        
    }
    else {
        container.find('img.secondaryImage').attr('src', y);
        container.find('img.ec_bcard').attr('src', x);
        
    }
    
}

/*
 * Event handler for the mousemove event on card images. This will trigger the zoom feature.
 */
function ec_queue_image_zoom_handler(event, bcard) {
    var par = bcard.parent();
    var zoomed = par.next();
    var bcard_zoomed = zoomed.find('.ec_bcard_zoomed img');
    var zoom_loading = zoomed.find('.ec_bcard_zoomed_loading');
    
    // calculate position ratios
    var scale_x = bcard_zoomed.width() / bcard.width();
    var scale_y = bcard_zoomed.height() / bcard.height();
    
    // find the position offset and update image position
    var card_pos = bcard.offset();
    var mouse_pos_rel_x = event.pageX - card_pos.left;
    var mouse_pos_rel_y = event.pageY - card_pos.top;
    var new_pos = {};
    new_pos.top = parseInt(((mouse_pos_rel_y * scale_y) - (zoomed.height() * 0.5)) * -1);
    new_pos.left = parseInt(((mouse_pos_rel_x * scale_x) - (zoomed.width() * 0.5)) * -1);
    //	console.log('new_pos: ', new_pos);
    //	console.log('el pageX: ', event.pageX);
    zoomed.css({
        'transform': 'translate(' + (mouse_pos_rel_x + 5) + 'px, ' + (mouse_pos_rel_y + 5) + 'px)',
        '-webkit-transform': 'translate(' + (mouse_pos_rel_x + 5) + 'px, ' + (mouse_pos_rel_y + 5) + 'px)'
    });
    zoomed.find('.ec_bcard_zoomed').css({
        'transform': 'translate(' + new_pos.left + 'px, ' + new_pos.top + 'px)',
        '-webkit-transform': 'translate(' + new_pos.left + 'px, ' + new_pos.top + 'px)'
    });
    
    // make zoomed image visible
    zoomed.finish().fadeIn(300);
}

/*
 * Create a dialog so the user can select a record for a lookup field
 */
function ec_create_recordtype_dialog(qItem) {
    var dialog = $('#ec_dialog_recordtype');
    $('#lookupRecordTypesContainer').html('');
    
    $('#lookupRecordTypesContainer').html(can.view('ec_tpl_lookupRecordTypes', { recordTypes: ec_recordTypes.Account }));
   
   	$('#acctCreateBtn').attr('disabled','true');
    //createNewAccount
    $('#acctNameInput').keyup(function() {
        if($('#acctNameInput').val().length > 0){
            $('#acctCreateBtn').removeAttr('disabled');
            $('#acctCreateBtn').removeClass('disabled');
        }
        else{
            
            $('#acctCreateBtn').addClass('disabled');
            $('#acctCreateBtn').attr('disabled','true');

        }
	});

    
    if (typeof ec_recordTypesDefault['Account'] != 'undefined') {
        $('#lookupRecordTypes').val(ec_recordTypesDefault['Account']);
    }
    dialog.find('.btn-continue-recordtype').off('click');
    dialog.find('.btn-continue-recordtype')
    // bind the click action to it to perform the search
    .click(function (e) {
        $('#recordTypeSearch').hide();
        $('#acctNameInput').val('');
        $('#acctNameInputArea').show();
        
        //recordTypeId = $('#lookupRecordTypes').val();
        //dialog.modal('hide');
        //createNewAccount(qItem, recordTypeId);
    });
    dialog.find('.btn-continue-acctCreate').off('click');
    dialog.find('.btn-continue-acctCreate')
    // bind the click action to it to create account
    .click(function (e) {
        recordTypeId = $('#lookupRecordTypes').val();
        $('#recordTypeSearch').hide();
        $('#acctNameInputArea').show();
        dialog.modal('hide');
		var nAcctId = auto_createNewAccount(qItem, recordTypeId, $('#acctNameInput').val());
        if(nAcctId[0].id != null && nAcctId[0].id != ''){
        	qItem.find('.ec_lookup_field[name="AccountId"]').val($('#acctNameInput').val());
        	qItem.find('.ec_lookup_field_val[name="AccountId"]').val(nAcctId[0].id);
            
        }
        //dialog.modal('show');
        //createNewAccount(qItem, recordTypeId);
    });
    
    // open dialog or go straight to new account
    if (typeof ec_recordTypesDefault['Account'] == 'undefined') {
        //createNewAccount(qItem, '');
        dialog.modal('show');
        recordTypeId='';
        $('#recordTypeSearch').hide();
        $('#acctNameInput').val('');
        $('#acctNameInputArea').show();
    }
    else {
        dialog.modal('show');
        $('#recordTypeSearch').show();
        $('#acctNameInputArea').hide();
    }
}

function ec_create_recordtype_dialog_classic(qItem) {
    var dialog = $('#ec_dialog_recordtype');
    $('#lookupRecordTypesContainer').html('');

    $('#lookupRecordTypesContainer').html(can.view('ec_tpl_lookupRecordTypes', { recordTypes: ec_recordTypes.Account }));

    //createNewAccount

    if (typeof ec_recordTypesDefault['Account'] != 'undefined') {
        $('#lookupRecordTypes').val(ec_recordTypesDefault['Account']);
    }
    dialog.find('.btn-continue-recordtype').off('click');
    dialog.find('.btn-continue-recordtype')
        // bind the click action to it to perform the search
        .click(function (e) {
            recordTypeId = $('#lookupRecordTypes').val();
            dialog.modal('hide');
            createNewAccount(qItem, recordTypeId);
        });

    // open dialog or go straight to new account
    if (typeof ec_recordTypesDefault['Account'] == 'undefined') {
        createNewAccount(qItem, '');
    }
    else {
       dialog.modal('show');
    }
}

function getIsPersonRecordType(recordTypeId){
    var query = sforce.connection.query("SELECT Id, IsPersonType FROM RecordType WHERE Id ='"+recordTypeId+"'");
    return query.records.IsPersonType;
    
}

function createNewAccount(qItem, recordTypeId) {
    var url = accountNewURL;

    var queueNum = qItem.attr('id').split('-')[1];
    var ocr = ec_queueItems.attr(queueNum + '.ocr') || null;

    var params = [];

    qItem = qItem.find('.active');

    params.push('name_firstacc2=' + encodeURIComponent(qItem.find('[name=FirstName]').val()));
    params.push('name_lastacc2=' + encodeURIComponent(qItem.find('[name=LastName]').val()));

    if (qItem.find('[name=Phone]').val() == undefined) {
        params.push('acc10=' + encodeURIComponent(qItem.find('[name=MobilePhone]').val()));
    }
    else {
        params.push('acc10=' + encodeURIComponent(qItem.find('[name=Phone]').val()));
    }

    params.push('acc20=' + encodeURIComponent(qItem.find('[name=Description]').val()));

    params.push('acc11=' + encodeURIComponent(qItem.find('[name=Fax]').val()));
    params.push('PersonTitle=' + encodeURIComponent(qItem.find('[name=Title]').val()));
    params.push('PersonEmail=' + encodeURIComponent(qItem.find('[name=Email]').val()));

    params.push('PersonMobilePhone=' + encodeURIComponent(qItem.find('[name=MobilePhone]').val()));


    if (qItem.find('[name=Company]').val() != undefined) {

        params.push('acc2=' + encodeURIComponent(qItem.find('[name=Company]').val()));

    }
    params.push('acc12=' + encodeURIComponent(qItem.find('[name=Website]').val()));
    params.push('acc17street=' + encodeURIComponent(qItem.find('[name=MailingStreet]').val()));
    params.push('acc18street=' + encodeURIComponent(qItem.find('[name=MailingStreet]').val()));
    params.push('acc17city=' + encodeURIComponent(qItem.find('[name=MailingCity]').val()));
    params.push('acc18city=' + encodeURIComponent(qItem.find('[name=MailingCity]').val()));
    params.push('acc17zip=' + encodeURIComponent(qItem.find('[name=MailingPostalCode]').val()));
    params.push('acc18zip=' + encodeURIComponent(qItem.find('[name=MailingPostalCode]').val()));

    // look at the OCR values and see what can be filled out on the account


    if (ocr != null) {



        if (ocr['company'] && ocr['company'].length > 0) {
            params.push('acc2=' + encodeURIComponent(ocr['company'][0]));

        }

        if (ocr['address_country'] && ocr['address_country'].length < 1) {
            ocr['address_country'].push(defaultCountry);
        }

        if (ocr['address_country'] && ocr['address_country'].length > 0) {
            var val = encodeURIComponent(ocr['address_country'][0]);

            // if country/state picklists are not enabled, use the plain text fields directly
            if (ec_cs_picklists == false) {
                params.push('acc17country=' + val);
                params.push('acc18country=' + val);
            }
            // otherwise, try to find the ocr value in the state/country code dropdowns instead
            else {
                var selects = qItem.find('select[name=CountryCode], select[name=MailingCountryCode]').first().clone();
                var op = (val == null || val == '' ? $() : selects.find('option[value=' + val + ']'));

                // if we couldn't find the exact text as a value...
                if (op.size() == 0) {
                    // check each option to see if the body text matches (case insensitive)
                    selects.find('option').each(function (index, el) {
                        var regex = new RegExp('^' + val + '$', 'i');
                        var el_ob = $(this);

                        // if the text matches, select that option and trigger the change event
                        if (regex.test(el_ob.text())) {
                            selects.val(el_ob.val());
                            return false;	// now that we know which option matches we can stop the looping
                        }
                    });
                }
                // otherwise, we can just select the right option by value
                else {
                    selects.val(val);
                }

                // the option that is now selected contains the value we need
                var selected_option = selects.find('option:selected').val();
                if (selected_option != null) {
                    params.push('acc17country=' + selected_option);
                    params.push('acc18country=' + selected_option);
                }
            }
        }
        if (ocr['address_state'] && ocr['address_state'].length > 0) {
            var val = encodeURIComponent(ocr['address_state'][0]);

            // if country/state picklists are not enabled, use the plain text fields directly
            if (ec_cs_picklists == false) {
                params.push('acc17state=' + val);
                params.push('acc18state=' + val);
            }
            // otherwise, try to find the ocr value in the state/country code dropdowns instead
            else {
                var selects = qItem.find('select[name=StateCode], select[name=MailingStateCode]').first().clone();

                var op = (val == null || val == '' ? $() : selects.find('option[value="' + val + '"]'));


                // if we couldn't find the exact text as a value...
                if (op.size() == 0) {
                    // check each option to see if the body text matches (case insensitive)
                    selects.find('option').each(function (index, el) {
                        var regex = new RegExp('^' + val + '$', 'i');

                        var el_ob = $(this);

                        // if the text matches, select that option and trigger the change event
                        if (regex.test(el_ob.text())) {
                            selects.val(el_ob.val());
                            return false;	// now that we know which option matches we can stop the looping
                        }
                    });
                }
                // otherwise, we can just select the right option by value
                else {
                    selects.val(val);
                }

                // the option that is now selected contains the value we need
                var selected_option = selects.find('option:selected').val();
                if (selected_option != null) {
                    params.push('acc17state=' + selected_option);
                    params.push('acc18state=' + selected_option);
                }
            }
        }




    }

    if (typeof recordTypeId != 'undefined') {
        params.push('RecordType=' + recordTypeId);
    }

    if (params.length > 0) {
        url += '?' + params.join('&');
        url = url.replace(/undefined/g, "");
    }

    if (detectmob()) {
       //url = '/one/one.app#/sObject/Account/new?recordTypeId=' + recordTypeId;
    }
    
    window.open(url, '_blank');

}

function auto_createNewAccount(qItem, recordTypeId, acctName) {
    
    var queueNum = qItem.attr('id').split('-')[1];
    var ocr = ec_queueItems.attr(queueNum + '.ocr') || null;
    qItem = qItem.find('.active');
    //create new account record object
    var account = new sforce.SObject('Account');
    var acctFldDesc = false;
    var acctFldMeta;
    if (typeof ec_obDesc["Account"] !== undefined){
        acctFldDesc = true;
        acctFldMeta = ec_obDesc["Account"];
    }
    
    
    var isPersonRecType = false;
    if(ec_personAccountsEnabled == true){
        isPersonRecType = getIsPersonRecordType(recordTypeId);
    }
    //set recordtype
    if(recordTypeId != '' && recordTypeId != null){
        var rectype = true;
        account.RecordTypeId = recordTypeId;
    }
    
    //if person accounts are enabled, will need to populate different fields
    if(ec_personAccountsEnabled == true && isPersonRecType == "true"){

        if(acctFldDesc == true && typeof acctFldMeta.LastName != "undefined" && acctFldMeta.LastName.updateable == true){
        	account.LastName = acctName;
        }
        if(acctFldDesc == true && typeof acctFldMeta.PersonHomePhone != "undefined" && acctFldMeta.PersonHomePhone.updateable == true){
            account.PersonHomePhone = qItem.find('[name=Phone]').val();
        }
        if(acctFldDesc == true && typeof acctFldMeta.PersonMobilePhone != "undefined" && acctFldMeta.PersonMobilePhone.updateable == true){
            account.PersonMobilePhone = qItem.find('[name=MobilePhone]').val();
        }
        if(acctFldDesc == true && typeof acctFldMeta.PersonMailingStreet != "undefined" && acctFldMeta.PersonMailingStreet.updateable == true){
            account.PersonMailingStreet = qItem.find('[name=MailingStreet]').val();
        }
        if(acctFldDesc == true && typeof acctFldMeta.PersonMailingCity != "undefined" && acctFldMeta.PersonMailingCity.updateable == true){
            account.PersonMailingCity = qItem.find('[name=MailingCity]').val();
        }
        if(acctFldDesc == true && typeof acctFldMeta.PersonMailingPostalCode != "undefined" && acctFldMeta.PersonMailingPostalCode.updateable == true){
            account.PersonMailingPostalCode = qItem.find('[name=MailingPostalCode]').val();
        }
        if(acctFldDesc == true && typeof acctFldMeta.PersonEmail != "undefined" && acctFldMeta.PersonEmail.updateable == true){
            account.PersonEmail = qItem.find('[name=Email]').val();
        }
        if(acctFldDesc == true && typeof acctFldMeta.PersonTitle != "undefined" && acctFldMeta.PersonTitle.updateable == true){
            account.PersonTitle = qItem.find('[name=Title]').val();
        }
        /*if (recordTypeId != '' && recordTypeId != null) {
            if(acctFldDesc == true && typeof acctFldMeta.RecordTypeId != "undefined" && acctFldMeta.RecordTypeId.updateable == true){
                account.RecordTypeId = recordTypeId;
            }
    	}*/
        if (ec_cs_picklists == false) {
            if(acctFldDesc == true && typeof acctFldMeta.PersonMailingCountry != "undefined" && acctFldMeta.PersonMailingCountry.updateable == true){
                account.PersonMailingCountry = qItem.find('[name=MailingCountry]').val();
            }
            if(acctFldDesc == true && typeof acctFldMeta.PersonMailingState != "undefined" && acctFldMeta.PersonMailingState.updateable == true){
                account.PersonMailingState = qItem.find('[name=MailingState]').val();
            }
        }
        else {
            if(qItem.find('[name=MailingCountryCode]').val() == '--placeholder--' || qItem.find('[name=MailingStateCode]').val == '--placeholder--'){
                //don't set
            }
            if( qItem.find('[name=MailingCountryCode]').val() == '--placeholder--'){
                //don't set
            }
            else{
                if(acctFldDesc == true && typeof acctFldMeta.PersonMailingCountryCode != "undefined" && acctFldMeta.PersonMailingCountryCode.updateable == true){
                    account.PersonMailingCountryCode = qItem.find('[name=MailingCountryCode]').val();
                }
            }
            if( qItem.find('[name=MailingStateCode]').val() == '--placeholder--'){
                //don't set
            }
            else {
                if(acctFldDesc == true && typeof acctFldMeta.PersonMailingStateCode != "undefined" && acctFldMeta.PersonMailingStateCode.updateable == true){
                    account.PersonMailingStateCode = qItem.find('[name=MailingStateCode]').val();
                }
            }
            
        }
        
        
    } //end populate of person account fields
    //If not person account, then populate standard business account fields
    else { 
        if(acctFldDesc == true && typeof acctFldMeta.Name != "undefined" && acctFldMeta.Name.updateable == true){
            account.Name = acctName;
        }
        if (qItem.find('[name=Phone]').val() == undefined) {
            if(acctFldDesc == true && typeof acctFldMeta.Phone != "undefined" && acctFldMeta.Phone.updateable == true){
                account.Phone = qItem.find('[name=MobilePhone]').val();
            }
        }
        else {
            if(acctFldDesc == true && typeof acctFldMeta.Phone != "undefined" && acctFldMeta.Phone.updateable == true){
                account.Phone = qItem.find('[name=Phone]').val();
            }
        }
        if(acctFldDesc == true && typeof acctFldMeta.Fax != "undefined" && acctFldMeta.Fax.updateable == true){
            account.Fax = qItem.find('[name=Fax]').val();
        }
        if(acctFldDesc == true && typeof acctFldMeta.BillingStreet != "undefined" && acctFldMeta.BillingStreet.updateable == true){
            account.BillingStreet = qItem.find('[name=MailingStreet]').val();
        }
        if(acctFldDesc == true && typeof acctFldMeta.ShippingStreet != "undefined" && acctFldMeta.ShippingStreet.updateable == true){
            account.ShippingStreet = qItem.find('[name=MailingStreet]').val();
        }
        if(acctFldDesc == true && typeof acctFldMeta.BillingCity != "undefined" && acctFldMeta.BillingCity.updateable == true){
            account.BillingCity = qItem.find('[name=MailingCity]').val();
        }
        if(acctFldDesc == true && typeof acctFldMeta.ShippingCity != "undefined" && acctFldMeta.ShippingCity.updateable == true){
            account.ShippingCity = qItem.find('[name=MailingCity]').val();
        }
        if(acctFldDesc == true && typeof acctFldMeta.BillingPostalCode != "undefined" && acctFldMeta.BillingPostalCode.updateable == true){
            account.BillingPostalCode = qItem.find('[name=MailingPostalCode]').val();
        }
        if(acctFldDesc == true && typeof acctFldMeta.ShippingPostalCode != "undefined" && acctFldMeta.ShippingPostalCode.updateable == true){
            account.ShippingPostalCode = qItem.find('[name=MailingPostalCode]').val();
        }
        /*if (recordTypeId != '' && recordTypeId != null) {
            if(acctFldDesc == true && typeof acctFldMeta.recordTypeId != "undefined" && acctFldMeta.recordTypeId.updateable == true){
                account.recordTypeId = recordTypeId;
            }
    	}*/
        if(acctFldDesc == true && typeof acctFldMeta.Website != "undefined" && acctFldMeta.Website.updateable == true){
            account.Website = qItem.find('[name=Website]').val();
        }
        if (ec_cs_picklists == false) {
            if(acctFldDesc == true && typeof acctFldMeta.BillingCountry != "undefined" && acctFldMeta.BillingCountry.updateable == true){
                account.BillingCountry = qItem.find('[name=MailingCountry]').val();
            }
            if(acctFldDesc == true && typeof acctFldMeta.ShippingCountry != "undefined" && acctFldMeta.ShippingCountry.updateable == true){
                account.ShippingCountry = qItem.find('[name=MailingCountry]').val();
            }
            if(acctFldDesc == true && typeof acctFldMeta.BillingState != "undefined" && acctFldMeta.BillingState.updateable == true){
                account.BillingState = qItem.find('[name=MailingState]').val();
            }
            if(acctFldDesc == true && typeof acctFldMeta.ShippingState != "undefined" && acctFldMeta.ShippingState.updateable == true){
                account.ShippingState = qItem.find('[name=MailingState]').val();
            }
        }
        else {
            if( qItem.find('[name=MailingCountryCode]').val() == '--placeholder--'){
                //don't set
            }
            else{
                if(acctFldDesc == true && typeof acctFldMeta.BillingCountryCode != "undefined" && acctFldMeta.BillingCountryCode.updateable == true){
                    account.BillingCountryCode = qItem.find('[name=MailingCountryCode]').val();
                }
                if(acctFldDesc == true && typeof acctFldMeta.ShippingCountryCode != "undefined" && acctFldMeta.ShippingCountryCode.updateable == true){
                    account.ShippingCountryCode = qItem.find('[name=MailingCountryCode]').val();
                }
            }
            if( qItem.find('[name=MailingStateCode]').val() == '--placeholder--'){
                //don't set
            }
            else {
                if(acctFldDesc == true && typeof acctFldMeta.BillingStateCode != "undefined" && acctFldMeta.BillingStateCode.updateable == true){
                    account.BillingStateCode = qItem.find('[name=MailingStateCode]').val();
                }
                if(acctFldDesc == true && typeof acctFldMeta.ShippingStateCode != "undefined" && acctFldMeta.ShippingStateCode.updateable == true){
                    account.ShippingStateCode = qItem.find('[name=MailingStateCode]').val();
                }
            }
        }
        
    }//end of populate business account fields
    
    //insert record and handle response message visible to user
    var result = sforce.connection.create([account]);
    if(result[0].getBoolean("success")){
        new PNotify({
            title: 'Success!',
            text: 'Account successfully created.',
            type: 'success'
        });
        
    }
    else{
        new PNotify({
            title: 'Your Salesforce setup does not allow an Account to be created from the Scanning page.',
            text: 'Message: ' + result[0].errors['message'] + '\n Status Code: ' + result[0].errors['statusCode'],
            type: 'error'
        });
        console.log(result);
        
    }
    return result;
    
    
}

/*
 * Create a dialog so the user can select a record for a lookup field
 */
function ec_create_lookup_dialog(type, field) {
    var dialog = $('#ec_dialog_lookup');
    
    // make sure only the search bar is showing
    dialog.find('.modal-body > div.ec_search_results, .modal-body > div.ec_search_results > ul').hide();
    $('#lookupFilters').html('');
    
    if (type == 'Account' && typeof ec_recordTypes.Account != 'undefined' && typeof ec_recordTypes != 'undefined' && ec_recordTypes.Account.length > 0) {
        $('#lookupFilters').html(can.view('ec_tpl_lookupFilters', { recordTypes: ec_recordTypes.Account }));
    }
    
    // update the search button value to hold the reference type
    dialog.find('.ec_search_bar button').val(type)
    // bind the click action to it to perform the search
    .click(function (e) {
        var btn = $(this);
        btn.attr('disabled', 'disabled');
        dialog.find('.modal-body > div.ec_search_results > ul').hide().empty();
        dialog.find('.modal-body > div.ec_search_results, .ec_loading').show();
        
        var search_term = dialog.find('.ec_search_bar input').val();
        var search_term_clean = search_term.replace(/\(/g, '').replace(/\)/g, '').replace(/"/g, '').replace(/\*/g, ''); // we need the string with symbols removed for the length calculation
        var validation_error_func = function (error) {
            var error_msg = (typeof error != 'undefined' && typeof error.message != 'undefined' ? error.message.charAt(0).toUpperCase() + error.message.slice(1) : T.convert('70') + '. ' + T.convert('44') + '.');
            dialog.find('.ec_search_results > ul').html('<li class="list-group-item clearfix ec_noresults">' + error_msg + '</li>');
            dialog.find('.ec_loading').fadeOut(300, function () {
                btn.removeAttr('disabled');
                dialog.find('.ec_search_results > ul').fadeIn();
            });
        }
        if (search_term == null || search_term == '') {
            validation_error_func({ message: T.convert('72') + '.' });
        }
        else if (search_term_clean.length < 3) {
            validation_error_func({ message: T.convert('73') + '.' });
        }
            else {
                
                var options = [];
                $.each($('#lookupFilters option:selected'), function () {
                    options.push($(this).val())
                });
                
                
                
                var sosl = search_term + '*';
                var sosl_where = '';
                
                if (type == 'Account' && options.length > 0) {
                    sosl_where += ' RecordTypeId IN (\'' + options.join("','") + '\')';
                    if(defaultLookupFilter){
                        sosl_where += " AND " +defaultLookupFilter;        
                    }
                }
                else if(type=='Account'){
                    if(defaultLookupFilter){
                        sosl_where +=" "+defaultLookupFilter;
                    }
                    
                }
                
                // check for existance of default value not being empty
                // append the value to the query
                // done!
                
                ec_lookup_objects(type, sosl, sosl_where, function (result, event) {
                    
                    var recordHTML = $('<div></div>');
                    var results = new can.List(result);
                    // if results were returned, add them to the DOM fragment
                    if (results.attr('length') > 0) {
                        for (var ii = 0; ii < results.attr('length'); ++ii) {
                            // check the list of additional fields to show, see if values were provided, and add them to the template object in a way the template can work with
                            var details = [];
                            for (var fieldIndex in ec_init_params.lookup_result_fields[type]) {
                                var fieldName = ec_init_params.lookup_result_fields[type][fieldIndex];
                                if (typeof fieldName === 'string') {
                                    var fieldValue = results.attr(ii + '.' + fieldName);
                                    if (typeof fieldValue !== 'undefined' && fieldValue != null) {
                                        details.push(fieldValue);
                                    }
                                }
                            }
                            if (details.length > 0) {
                                results.attr(ii + '.details', details);
                            }
                            recordHTML.append(can.view('ec_tpl_search_result', results.attr(ii)));
                        }
                    }
                    // otherwise, just create one to tell the user nothing was found
                    else {
                        recordHTML.append('<li class="list-group-item clearfix ec_noresults">' + T.convert('74') + '.</li>');
                    }
                    
                    // put the results into the dialog
                    dialog.find('.ec_search_results > ul').html(recordHTML.html())
                    // bind the click action to each record to set the record ID for the object field
                    .children('li').find('button.btn-success').click(function () {
                        var nameParts = $(this).parent().parent().parent().attr('name').split('-');
                        var id = nameParts.splice(0, 1);
                        var name = nameParts.join('-');
                        field.val(name).parents('.form-group').children('.ec_lookup_field_val').val(id);
                        dialog.modal('hide');
                    }
                                                                    );
                    
                    dialog.find('.ec_loading').fadeOut(300, function () {
                        btn.removeAttr('disabled');
                        dialog.find('.ec_search_results > ul').fadeIn().scrollTop(0);
                    });
                },
                                  validation_error_func
                                 );
            }
    });
    
    // reset the dialog when closed
    dialog.on('hidden.bs.modal', function (e) {
        dialog.find('.ec_search_bar input').val('');
        dialog.find('.ec_loading, .ec_search_results, .ec_search_results > ul').hide();
        dialog.find('.ec_search_bar button').removeAttr('disabled');
    });
    
    
    
    
    // open dialog 
    dialog.modal('show');
    
    
    
    // give search field focus
    setTimeout(function () {
        
        dialog.find('.ec_search_bar input').focus();
    }, 500);
}

/*
 * Rotates the given element clockwise in 90* increments
 */
function ec_rotateEl(el, overflow) {
    var current_rotation = 0;
    var current_class = '';
    var next_class = 'ec_rotate_90';
    var img_dimensions = [];
    if (el.hasClass('ec_rotate_90')) {
        current_class = 'ec_rotate_90';
        next_class = 'ec_rotate_180';
        img_dimensions = [el.outerWidth(), el.outerHeight()];
    }
    else if (el.hasClass('ec_rotate_180')) {
        current_class = 'ec_rotate_180';
        next_class = 'ec_rotate_270';
        img_dimensions = [el.outerHeight(), el.outerWidth()];
    }
        else if (el.hasClass('ec_rotate_270')) {
            current_class = 'ec_rotate_270';
            next_class = 'ec_rotate_360';
            img_dimensions = [el.outerWidth(), el.outerHeight()];
        }
            else {
                current_class = 'ec_rotate_360';
                img_dimensions = [el.outerHeight(), el.outerWidth()];
            }
    
    el.removeClass(current_class).addClass(next_class)
    if (overflow !== false) {
        var par = el.parent().css({ overflowX: 'hidden' }).animate({ height: img_dimensions[1] }, 1000, function () {
            par.css({ overflowX: 'auto' });
        }
                                                                  );
        // TODO: after the animation ends, trigger a reflow on the parent DOM element to make sure scrollbars appear in chrome
        setTimeout(function () {
            
        }, 1500);
    }
}

function updateDependentPicklists(target){
     //set variables and get object
       var controlVal = $("option:selected", target).text();
       var controlFld;
       var dependFld;
       var tObj;
       var containerTab = $(target).closest('.tab-pane');
       var options;
       var aControlName;
       var isAlsoControl;
       
       if(containerTab.attr('id').includes('contact')){
          tObj = 'Contact';
       }
       else if(containerTab.attr('id').includes('lead')){
          tObj = 'Lead';
       }
       var dependSelects = containerTab.find('select[controllerName="'+$(target).attr('name')+'"]');
       
       if(dependSelects != null && dependSelects.length > 0){
           
           for(var i = 0; i < dependSelects.length; i++){
               //get value of selected option of dependent picklist
               var depSelVal = dependSelects[i].value;
               //clear the dependent picklist values
               dependSelects[i].options.length=1;
               
               
               controlFld = dependSelects[i].getAttribute('controllername');
               dependFld = dependSelects[i].getAttribute('name');
               options = getDependentOptions(tObj, controlFld, dependFld);
               //Options returned as array ex '{displayVal1 : [label###apiVal], displayVal2 : [label###apiVal]}
               
               
                   //check if dependent vals are avail for controlling val
                   if(options[controlVal] != null && options[controlVal].length > 0){
                       var dependVals = options[controlVal];
                       for(var j = 0; j < dependVals.length; j++){
                           //split returned value
                           var valsOption = dependVals[j].split('###');
                           var opt = document.createElement('option');
                           opt.appendChild( document.createTextNode(valsOption[0]));
                           opt.value = valsOption[1];
                           opt.classList.add('ec_picklist_index_' + j);
                           dependSelects[i].appendChild(opt);
                           //if selected value of dependent picklist is set and available in new picklist values, reset the select
                           if(valsOption[1]==depSelVal){
                               dependSelects[i].value = depSelVal;
                           }
                           setPlaceholderTextforPL(dependSelects[i]);
                          
                       }
                   }
               //check if dependent field is also controlling field
               if(dependSelects[i].hasAttribute('controllingfield') && dependSelects[i].hasAttribute('controllername')){
                   //get dependent field
                   var dependOfDepend = containerTab.find('select[controllername="'+dependSelects[i].getAttribute('name')+'"]');
                   //check if found
                   if(dependOfDepend != null && dependOfDepend.length > 0){
                       for ( var n=0; n < dependOfDepend.length; n++){
                           if(dependSelects[i].value == '--placeholder--'){
                               dependOfDepend[n].options.length = 1;
                               dependOfDepend[n].value = '--placeholder--';
                               setPlaceholderTextforPL(dependOfDepend[n]);
                           }
                       }
                   }
               }
               }
               //check if parent value is not set in the case of multiple dependents
          	}
          	var allDependSelects = containerTab.find('select[controllerName]');

 		  	if(allDependSelects != null && allDependSelects.length > 0){
           		//check if parent value is set and set default on dependents if not
                for (var k=0; k < allDependSelects; k++){
                    aControlName = allDependSelects[i].getAttribute('controllername');
                    var aControl = containerTab.find('[name="'+aControlName+'"]');
                    if(aControl.value=='--placeholder--'){
                    	allDependSelects[i].value = '--placeholder--';
                        allDependSelects[i].classList.add('ec_select_placeholder');
                    }
                	 
                }   
            }

    
}
function setPlaceholderTextforPL(target){
        if ($(target).val() == '--placeholder--') {
            $(target).addClass('ec_select_placeholder');
        }
        else {
            $(target).removeClass('ec_select_placeholder');
        }
    }
/*
 * Search for objects using the given term
 */
function ec_lookup_objects(type, sTerm, sWhere, success, failure) {
    eContacts.Queue_Controller.searchForLookup(type, sTerm, sWhere, function (result, event) {
        if (event.status) {
            if (success != null) {
                success(result, event);
            }
        }
        else {
            failure(event);
        }
    },
                                               function (errors) {
                                                   if (failure != null) {
                                                       failure(errors);
                                                   }
                                               },
                                               { escape: false });
}
// parse out GET variables from the URL
var URLvars = {};
var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
    URLvars[key] = value;
});
$(document).ready(function () {
        
    
    window.controllers = {};
    
    
    // if a card was specified in the URL then turn on single card mode
    if (typeof URLvars.card !== 'undefined') {
        eContacts_app.attr('singleCardMode', true);
        $('#scan-toolbar').hide();
        
    }
    else {
        $('#scan-toolbar').show()
    }
    
    
    var select_ = $('#alluserswithcards');
    $.each(filterByOptionsJSON, function (key, value) {
        select_.append('<option value="' + key + '">' + value + '</option>')
    });
    $('#userFilterOptions').chosen();
    
    $('#userFilterOptions').chosen().change(
        function (k, v) {
            console.log($("#userFilterOptions").chosen().val());
            if ($("#userFilterOptions").chosen().val() == null) {
                
            }
            else {
                $('#ec_page_process').empty();
                ec_fetch_records(EC_QUEUE_FETCH_QTY, true);
            }
        }
        
        
    );
    
    // if the user has IE 8 or earlier then the UX will not be pleasant so ask them to upgrade and disable everything
    if (isIE(8, 'lte')) {
        document.getElementById('ve_ec_container').innerHTML = T.convert('75') + '. ' + T.convert('76') + '.';
    }
    else {
        // if there are no queue items then let the user know and skip over all the queue item code
        if (eContacts_app == null || eContacts_app.attr('allPendingCount') == 0) {
            // add a delay so the UI doesn't feel too twitchy
            setTimeout(function () {
                $('#ec_loading_items').fadeOut(300, function () {
                    $('#ec_noitems').fadeIn();
                });
            },
                       900
                      );
        }
        else {
            $('#ec_pending_count').html(eContacts_app.attr('pendingCount'));
            
            // add field html to template in DOM
            
            ec_field_whitelist.each(function (ob, objectName) {
                
                
                
                // don't bother building a template for objects the user can't create
                if ((objectName == 'Lead' && ec_showLeadsTab === false) || (objectName == 'Contact' && ec_showContactsTab === false)) {
                    
                    return true;
                }
                var ec_tpl = $('<div></div>');
                
                ob.each(function (width, fieldName) {
                    if (ec_field_blacklist[objectName][fieldName] == null && ec_field_whitelist.attr(objectName + '.' + fieldName) != null) {
                        var fieldMeta = ec_obDesc.attr(objectName + '.' + fieldName);
                        
                        
                        if (fieldMeta != null) {
                            ec_tpl.append(ec_getFieldHTML(fieldMeta, objectName));
                        }
                        else {
                            
                            
                        }
                    }
                });
                
                
                /* add event listeners to the controler fields
                
                //for (var x in Object.keys(window.controllers)){
                Object.keys(window.controllers).forEach(function(x){
                    var fieldMeta = window.controllers[x];
                    var controllerElement = document.getElementsByName(fieldMeta.attr('controllerName'));
                    setTimeout(function () {
                        for (var i = 0; i < controllerElement.length; i++) {
                            controllerElement[i].onchange = function () {
                                if(fieldMeta.controllerName.indexOf('Country')==-1)
                                    for (var k = 0; k < fieldMeta._data.picklistValues.length; k++) {
                                        if (this.selectedIndex)
                                            if (this.selectedIndex != 0)
                                                if (ec_isDependentValue(this.selectedIndex - 1, JSON.stringify(fieldMeta._data.picklistValues[k].validFor).replace(/"/g, ''))) {
                                                    for (var j = 0; j < controllerElement.length; j++) {
                                                        document.getElementsByName(fieldMeta.attr('name'))[j][k + 1].style.display = 'flex';
                                                    }
                                                }
                                        
                                                else {
                                                    for (var j = 0; j < controllerElement.length; j++) {
                                                        document.getElementsByName(fieldMeta.attr('name'))[j][k + 1].style.display = 'none';
                                                    }
                                                }
                                    }
                            };
                        }
                    }, 2000);
                });
                */
                
                //add controllingField attribute to controlling picklists
               	var dependLists = ec_tpl.find('select[controllerName]');
                if(dependLists != null && dependLists.length > 0){
                    for(var j=0; j < dependLists.length; j++){
                        var controllerName = dependLists[j].getAttribute('controllerName');
                        var controllerPL = ec_tpl.find('[name="' + controllerName + '"]');
                        if(controllerPL != null){
                            $(controllerPL).attr('controllingField', true);
                        }
                    }
                } 
                else {
                    //no controlling picklists to update
                }
                
                try {
                    $('#ec_tpl_' + objectName.toLowerCase() + 'form')[0].text = ec_tpl.html();
                    
                }
                catch (e) {
                    console.log(e);
                }
            });
            
            // add the first batch of records to the page
            if (ec_queueItemsRaw.length > 0) {
                ec_pause_iscroll = true;
                ec_queueItems.push.apply(ec_queueItems, ec_queueItemsRaw);
                
                $('#ec_loading_items').fadeOut(function () {
                    // make infinite scroll active unless a specific card was requested
                    if (eContacts_app.attr('singleCardMode') == false) {
                        ec_pause_iscroll = false;
                    }
                });
            }
            else {
                // if a single card was requested but not found then notify the user
                if (eContacts_app.attr('singleCardMode') == true) {
                    //eContacts_app.attr('singleCardMode', false);
                    ec_pause_iscroll = false;
                    ec_fetch_records(EC_QUEUE_FETCH_QTY);
                    
                    /*	$('#ec_loading_items').fadeOut(300, function(){
                            $('#ec_card_not_found').fadeIn();
                        });
                        */
                }
                // otherwise, the list must be empty because there are no cards left
                else {
                    
                    eContacts_app.attr('singleCardMode', false);
                    ec_pause_iscroll = false;
                    ec_fetch_records(EC_QUEUE_FETCH_QTY);
                    
                    /*
                     * $('#ec_loading_items').fadeOut(300, function(){
                        $('#ec_noitems').fadeIn();
                    });
                    */
                }
            }
            $('#ec_page_process').fadeIn();
            
            // when the user presses enter after typing in the lookup search dialog, trigger the search button
            $('#ec_dialog_lookup').find('.ec_search_bar input').bind('keyup keypress', function (e) {
                var code = e.which || e.keyCode;
                if (code == 13) {
                    $('#ec_dialog_lookup').find('.ec_search_bar button').click();
                    return false;
                }
            });
            
            // bind delete functionality to delete button in dialog
            $('#ec_dialog_delete .ec_btn_delete').click(function () {
                var idParts = $(this).val().split('-');
                var qIndex = idParts[1];
                var qId = idParts[0];
                ec_delete_record(qId, function (records) {
                    new PNotify({
                        title: T.convert('77'),
                        text: T.convert('78') + '.',
                        type: 'success'
                    });
                    
                    // update the UI
                    ec_queueItems.attr(qIndex + '.UserDeleted', true);
                    
                    $('#ec_dialog_delete').modal('hide');
                },
                                 function (errors) {
                                     if (errors.length > 0) {
                                         for (var ii = 0; ii < errors.length; ++ii) {
                                             new PNotify({
                                                 title: T.convert('79'),
                                                 text: errors[ii],
                                                 type: 'error'
                                             });
                                         }
                                     }
                                     else {
                                         new PNotify({
                                             title: T.convert('79'),
                                             text: T.convert('81') + '. ' + T.convert('44') + '.',
                                             type: 'error'
                                         });
                                     }
                                     
                                     $('#ec_dialog_delete').modal('hide');
                                 });
            });
        }
        
        // convert some string values to appropriate primitives
        eContacts_app.attr('tierData.Processing_Cap', parseInt(eContacts_app.attr('tierData.Processing_Cap')));
        eContacts_app.attr('tierData.Records_Processed', parseInt(eContacts_app.attr('tierData.Records_Processed')));
        eContacts_app.attr('tierData.Ignore_Processing_Cap', (eContacts_app.attr('tierData.Ignore_Processing_Cap') == 'true'));
        
        // create 'my cards' toggle
        $("#ec_owned_toggle").bootstrapSwitch({ state: true }).bind('switchChange.bootstrapSwitch', function (event, state) {
            eContacts_app.attr('myCardsOnly', state);
        }).bootstrapSwitch('state', true, true);
        
        // hide/show the toggle
        eContacts_app.attr('tierData.Hide_All_Cards_Toggle', (eContacts_app.attr('tierData.Hide_All_Cards_Toggle') == 'true'));
        
        // create advanced mode toggle
        $("#ec_advanced_toggle").bootstrapSwitch().bind('switchChange.bootstrapSwitch', function (event, state) {
            $('.ec_queue_item .ec_right_col input, .ec_queue_item .ec_right_col select').parents('.form-group').not('.ec_required_field').not('.ec_simple_field').slideToggle();
        });
        
        // hide/show the toggle
        eContacts_app.attr('tierData.Hide_Advanced_Mode_Toggle', (eContacts_app.attr('tierData.Hide_Advanced_Mode_Toggle') == 'true'));
        
        // activate button to upgrade page
        $('#ec_btn_upgrade').click(function () {
            window.open('http://www.visionecontacts.com/contact/index.php', '_blank');
        });
        
        // infinite scroll
        $(window).scroll(function () {
            var pageHeight = $(document).height() - $(window).height();
            
            if (eContacts_app.attr('singleCardMode') == false && ec_pause_iscroll == false && pageHeight == $(this).scrollTop()) {
                
                ec_fetch_records(EC_QUEUE_FETCH_QTY);
            }
        });
        
        // make placeholder text work for IE9
        $('input, textarea').placeholder();
        
        // load the first time user settings utility class
        if (typeof ECONTACTS_FTU_SETTINGS != 'undefined') {
            ECONTACTS_FTU_SETTINGS.init({ current_values: eContacts_app.attr('tierData.First_Time_User_Settings') });
            
            // if the welcome screen is enabled then show it
            if (ECONTACTS_FTU_SETTINGS.isEnabled(ECONTACTS_FTU_SETTINGS.FUS_QUEUE_PAGE_WELCOME)) {
                sweetAlert({
                    title: T.convert('83') + '!',
                    text: T.convert('84') + ". ",
                    type: 'success',
                    confirmButtonText: T.convert('85')
                },
                           function () {
                               // once the user sees this, turn the notification off so they don't get bothered again
                               eContacts.Queue_Controller.updateFUS(ECONTACTS_FTU_SETTINGS.FUS_QUEUE_PAGE_WELCOME, false, function (result, event) {
                                   if (event.status) {
                                       ECONTACTS_FTU_SETTINGS.mask = result;
                                       
                                       if (sforce && sforce.one) {
                                           sforce.one.navigateToURL('/apex/eContacts__Help')
                                       }
                                       
                                       else {
                                           window.location.href = ec_baseURL + '/apex/eContacts__Help';
                                       }
                                   }
                               });
                           }
                          );
            }
        }
        
        // bind click handlers for warning panels
        $('#ec_warning_panel').bind('click', function (event) {
            var target = $(event.target);
            
            if (event.target.nodeName.toLowerCase() == 'a') {
                var targetIcon = target.prev('.glyphicon-chevron-down, .glyphicon-chevron-up');
                $(this).find('.panel-title .glyphicon-chevron-up').not(targetIcon).removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
                targetIcon.toggleClass('glyphicon-chevron-down glyphicon-chevron-up');
                //	$(this).find('.collapse, .collapsing').not('.in').prev().find('.glyphicon-chevron-up').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
            }
            else if (target.hasClass('ec_warningbtn_dismiss')) {
                var index = parseInt(target.val());
                ec_warnings.splice(index, 1);
            }
                else if (target.hasClass('ec_warningbtn_hide')) {
                    target.addClass('.disabled');
                    var ftu_val = parseInt(target.val());
                    eContacts.Queue_Controller.updateFUS(ftu_val, false, function (result, event) {
                        target.addClass('.disabled');
                        if (event.status) {
                            ECONTACTS_FTU_SETTINGS.mask = result;
                            target.next().click();
                        }
                    });
                }
        });
        
        // see if we need to show any warnings
        if (!ec_leadFieldUpdateable_ImgData && ECONTACTS_FTU_SETTINGS.isEnabled(ECONTACTS_FTU_SETTINGS.FUS_WARNING_IMG_FIELD_LEAD)) {
            ec_optimizations.unshift(1);
        }
        if (!ec_contactFieldUpdateable_ImgData && ECONTACTS_FTU_SETTINGS.isEnabled(ECONTACTS_FTU_SETTINGS.FUS_WARNING_IMG_FIELD_CONTACT)) {
            ec_optimizations.unshift(2);
        }
        if (!ec_leadFieldUpdateable_CreatedBy && ECONTACTS_FTU_SETTINGS.isEnabled(ECONTACTS_FTU_SETTINGS.FUS_WARNING_CREATEDBY_FIELD_LEAD)) {
            ec_optimizations.unshift(3);
        }
        if (!ec_contactFieldUpdateable_CreatedBy && ECONTACTS_FTU_SETTINGS.isEnabled(ECONTACTS_FTU_SETTINGS.FUS_WARNING_CREATEDBY_FIELD_CONTACT)) {
            ec_optimizations.unshift(4);
        }
        
        // bind the optimizations to the template and update the DOM
        $('#ec_optimization_panel').html(can.view('ec_tpl_app_optimization',
                                                  {
                                                      idStr: ec_optimizations.join(','),
                                                      count: can.compute(function () { return ec_optimizations.length; }),
                                                      isPlural: can.compute(function () { return (ec_optimizations.length > 1 ? true : false); })
                                                  }
                                                 ));
        
        // bind the warnings to the template and update the DOM
        $('#ec_warning_panel').html(can.view('ec_tpl_app_warnings', { warnings: ec_warnings }));
    }
    
    
    
    
    setTimeout(function () { // refresh quota
        
        eContacts.Queue_Controller.getRefreshTierData(function (result, event) {
            
        });
        
    }, 500);
    
    
    
    
}); // end doc ready