@isTest
private class DailyLeadProcessorTest {

    // Dummy CRON expression: midnight on March 15.
    // Because this is a test, job executes
    // immediately after Test.stopTest().
    public static String CRON_EXP = '0 0 0 15 3 ? 2022';

	@isTest static void testScheduledJob() {
// DailyLeadProcessor
        // Create some out of date Opportunity records
        List<Lead> ldList = new List<Lead>();

        for (Integer i=0; i<200; i++) {
            Lead ld = new Lead(LastName = 'Lead ' + i, Company = 'Company ' + i);
            ldList.add(ld);
        }
        insert ldList;
        
        Test.startTest();
        // Schedule the test job
        String jobId = System.schedule('ScheduledApexTest',
            CRON_EXP, 
            new DailyLeadProcessor());         
        Test.stopTest();
        
        // Now that the scheduled job has executed,
        System.assertEquals(200,[SELECT Id FROM Lead WHERE LastName like 'Lead%' AND LeadSource = 'Dreamforce'].size());

    }
}