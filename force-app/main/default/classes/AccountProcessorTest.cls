@IsTest
private class AccountProcessorTest {
    @isTest 
	public static void testCountContacts() {
		// Test Datas
		List<Account> actList = new List<Account>{new Account(Name='Act1'), new Account(Name='Act2')};
		insert actList;
        
        Candidate__c cnd = new Candidate__c();
        cnd.testaam1__c = 'toto';
        
		List<Contact> cntList = new List<Contact>{	new Contact(LastName='Cnt1', FirstName='Test1', AccountId=actList[0].Id),
													new Contact(LastName='Cnt2', FirstName='Test2', AccountId=actList[0].Id),
													new Contact(LastName='Cnt3', FirstName='Test3', AccountId=actList[1].Id),
													new Contact(LastName='Cnt4', FirstName='Test4', AccountId=actList[1].Id) };

		insert cntList;

        Test.startTest();
		AccountProcessor.countContacts(new List<ID>{actList[0].Id,actList[1].Id});
        Test.stopTest();
	}
}