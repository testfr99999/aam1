public class ParkLocator {
    public static List<String> country(String country) {
        //parkService.ParksImplPort parkSvc = new parkService.ParksImplPort();
        ParkService.ParksImplPort parkSvc = new ParkService.ParksImplPort();
        List<String> parksList = parkSvc.byCountry(country);
        return parksList;
    }
}