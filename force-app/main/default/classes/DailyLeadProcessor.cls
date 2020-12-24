global class DailyLeadProcessor implements Schedulable {

    global void execute(SchedulableContext ctx) {
        List<Lead> ldUpdList = new List<Lead>();

		for(Lead ld:[SELECT Id, LeadSource FROM Lead WHERE LeadSource = null LIMIT 200]){
			ld.LeadSource = 'Dreamforce';
			ldUpdList.add(ld);
		}
		
		if(ldUpdList.size()>0)
			update ldUpdList;

	}
    
}