@isTest
public class AddPrimaryContactTest {

    @testSetup 
    static void setup() {
        List<Account> accounts = new List<Account>();

        // add 100 accounts (50 CA, 50 NY)
        for (Integer i = 0; i < 50; i++) {
            accounts.add(new Account(
                name='Test Account'+i,
				BillingState = 'CA'
            ));
        }

        for (Integer i = 50; i < 100; i++) {
            accounts.add(new Account(
                name='Test Account'+i,
				BillingState = 'NY'
            ));
        }
        insert accounts;
    }
    
    static testmethod void testQueueable() {
        // query for test data to pass to queueable class
        List<Account> accounts = [select id, name, BillingState from account where name like 'Test Account%'];
		
		Contact primCnt = new Contact(LastName='Primary', FirstName='Contact');
		
        // Create our Queueable instance
        AddPrimaryContact addPrmCnt = new AddPrimaryContact(primCnt, 'CA');
        // startTest/stopTest block to force async processes to run
        Test.startTest();        
        System.enqueueJob(addPrmCnt);
        Test.stopTest();        
        // Validate the job ran. Check if record have correct parentId now
        System.assertEquals(50, [select count() from Contact where Account.BillingState = 'CA']);
    }
    
}