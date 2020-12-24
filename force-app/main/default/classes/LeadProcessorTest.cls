@isTest
private class LeadProcessorTest {

    @testSetup 
    static void setup() {
        List<Lead> leadList = new List<Lead>();

        // insert 200 leads
        for (Integer i=0;i<200;i++) {
            leadList.add(new Lead(LastName='Lead '+i, Company='Company '+i));
        }
        insert leadList;
    }

    static testmethod void test() {        
        Test.startTest();
        LeadProcessor lp = new LeadProcessor();
        Id batchId = Database.executeBatch(lp);
        Test.stopTest();

        // after the testing stops, assert records were updated properly
        // System.assertEquals(10, [select count() from contact where MailingCity = 'New York']);
    }
    
}