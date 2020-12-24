public class AccountProcessor
{
    @future
    public static void countContacts(List<ID> actIdList)
    {
        List<Account> actList = new List<Account>();
        for(AggregateResult ar:[SELECT AccountId,Count(Id) nbCnt
								FROM Contact 
								WHERE AccountId IN :actIdList GROUP BY AccountId])
        {
            actList.add(new Account(Id= (ID)ar.get('AccountId'), 
									Number_of_Contacts__c= (Integer)ar.get('nbCnt')));
        }
        
        if(actList.size()>0)
            update actList;
    }

}