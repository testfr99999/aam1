public class AddPrimaryContact implements Queueable {
    
    private Contact myContact;
    private String bilState;
    
    public AddPrimaryContact(Contact cnt, String state) {
		this.bilState = state;
		this.myContact = cnt;
    }

    public void execute(QueueableContext context) {
		
		List<Contact> cntInsert = new List<Contact>();
		
        for (Account act : [SELECT Id, Name FROM Account WHERE BillingState = :bilState LIMIT 200]) {
			Contact clonedCnt = myContact.clone(false, false, false, false);
			clonedCnt.AccountId = act.Id;
			cntInsert.add(clonedCnt);
		}

		if(cntInsert.size()>0)
			insert cntInsert;
    }
    
}