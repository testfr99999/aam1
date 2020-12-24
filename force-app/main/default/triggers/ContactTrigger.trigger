trigger ContactTrigger on Contact (after update) {
    integer i=0;
    for(Contact cnt:Trigger.old)
	    system.debug('dummy: ' + cnt.dummy__c);
    /*
    List<Contact> cntUpdList = new List<Contact>();
    if(Trigger.isAfter && Trigger.isUpdate && !EmailMissionSpecialist.isTriggerRecursive()){
        for(Contact cnt:Trigger.new){
            Trigger.new[i].Dummy__c = Trigger.new[i].Dummy__c + 10;
            cntUpdList.add(Trigger.new[i]);
            i++;
        }
        update cntUpdList;
    }*/
}