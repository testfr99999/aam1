trigger OpportunityTrigger on Opportunity (after insert, after update, after delete) {

    Set<String> apIdSet = new Set<String>();
    List<Opportunity> oppList = Trigger.isDelete ? Trigger.Old : Trigger.New;
    for(Opportunity opp:oppList){
        if((!String.isBlank(opp.Assessment_Provider__c) || !String.isBlank(Trigger.OldMap.get(opp.Id).Assessment_Provider__c)) &&
            (opp.StageName == 'Closed Won' || (Trigger.OldMap.get(opp.Id).StageName == 'Closed Won'))){
            apIdSet.add(opp.Assessment_Provider__c);
            apIdSet.add(Trigger.OldMap.get(opp.Id).Assessment_Provider__c);
        }
    }
    
    if(!apIdSet.isEmpty()){
        List<Assessment_Provider__c> apList = new List<Assessment_Provider__c>();
        List<AggregateResult> arList = [SELECT Assessment_Provider__c, Count(Id) 
                                        FROM Opportunity 
                                        WHERE Assessment_Provider__c IN :apIdSet 
                                        AND StageName = 'Closed Won'
                                        AND IsDeleted = false
                                        GROUP BY Assessment_Provider__c];
        for(AggregateResult ar:arList){
            Assessment_Provider__c ap = new Assessment_Provider__c();
            ap.Id = String.valueOf(ar.get('Assessment_Provider__c'));
            ap.Assessment_Total__c =  Decimal.valueOf(String.valueOf(ar.get('expr0')));
            apList.add(ap);
        }

        update apList;
    }
}