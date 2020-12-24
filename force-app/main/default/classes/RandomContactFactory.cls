public class RandomContactFactory {
    public static List<Contact> generateRandomContacts(Integer numCnts, String cntLastName) {
		List<Contact> cntList = new List<Contact>();
		for(Integer i=0; i<numCnts; i++) {
			cntList.add(new Contact(FirstName=cntLastName + ' ' + i, LastName=cntLastName + ' ' + i));
		}
		return cntList;
    }
}