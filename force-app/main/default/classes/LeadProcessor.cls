global class LeadProcessor implements Database.Batchable<sObject> {
    
    global Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator(
            'SELECT Id, LeadSource FROM Lead '
        );
    }

    global void execute(Database.BatchableContext bc, List<Lead> scope){
        // process each batch of records
        List<Lead> leadList = new List<Lead>();
        for (Lead ld : scope) {
			ld.LeadSource = 'Dreamforce';
			leadList.add(ld);
        }
		if(leadList.size()>0)
			update leadList;
    }    

    global void finish(Database.BatchableContext bc){
    }    

}