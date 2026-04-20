import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import path from "path";

// Register Geist font from local node_modules
Font.register({
    family: "Geist",
    fonts: [
        {
            src: path.join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf"),
            fontWeight: "normal",
        },
        {
            src: path.join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans/Geist-Bold.ttf"),
            fontWeight: "bold",
        },
    ],
});

interface AgreementDocumentProps {
    signatureUrl?: string;
    dateStr: string;
}

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: "Geist",
        fontSize: 10,
        lineHeight: 1.5,
        color: "#000000",
    },
    title: {
        fontSize: 14,
        marginBottom: 20,
        textAlign: "center",
        fontWeight: "bold",
        textDecoration: "underline",
    },
    section: {
        marginBottom: 10,
    },
    heading: {
        fontSize: 11,
        marginBottom: 4,
        fontWeight: "bold",
        marginTop: 10,
    },
    paragraph: {
        marginBottom: 8,
        textAlign: "justify",
    },
    signatureBlock: {
        marginTop: 30,
        wrap: false,
    },
    signatureLabel: {
        fontSize: 10,
        fontWeight: "bold",
        marginBottom: 10,
    },
    signatureImage: {
        width: 120,
        height: 60,
        objectFit: "contain",
    },
    footer: {
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        paddingTop: 10,
        fontSize: 8,
        color: "#6b7280",
        textAlign: "center",
    },
});

const AgreementDocument = ({ signatureUrl, dateStr }: AgreementDocumentProps) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.title}>HOST AGREEMENT</Text>

                <View style={styles.section}>
                    <Text style={styles.paragraph}>
                        This Agreement ("Agreement") is entered into between Arkanet Ventures LLP (hereinafter referred to as "Company") and the individual or entity ("Host") who wishes to list their property ("Property") on the Company’s platform, ContCave ("Platform"). By listing the Property, Host agrees to comply with the terms and conditions outlined below.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.heading}>1. Listing Property</Text>
                    <Text style={styles.paragraph}>
                        1.1 Host agrees to provide accurate and up-to-date information about the Property, including property type, location, amenities, availability, pricing, and any rules or restrictions associated with the Property.
                    </Text>
                    <Text style={styles.paragraph}>
                        1.2 Host acknowledges that any photos, descriptions, or other content provided for the Property listing must accurately represent the Property and may be subject to review by the Company.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.heading}>2. Host Responsibilities</Text>
                    <Text style={styles.paragraph}>
                        2.1 Host agrees to maintain the Property in a safe and habitable condition, in compliance with all applicable laws, regulations, and building codes.
                    </Text>
                    <Text style={styles.paragraph}>
                        2.2 Host acknowledges responsibility for ensuring that guests comply with any rules, regulations, or restrictions related to the use of the Property.
                    </Text>
                    <Text style={styles.paragraph}>
                        2.3 Host agrees to promptly respond to guest inquiries, booking requests, and any issues or concerns raised by guests during their stay at the Property.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.heading}>3. Booking and Payments</Text>
                    <Text style={styles.paragraph}>
                        3.1 Host agrees to honor all bookings made through the Platform and to provide guests with the agreed-upon accommodations and services.
                    </Text>
                    <Text style={styles.paragraph}>
                        3.2 Host acknowledges that the Company may collect payments from guests on behalf of the Host and remit the applicable fees to the Host in accordance with the agreed-upon terms and conditions.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.heading}>4. Compliance with Laws</Text>
                    <Text style={styles.paragraph}>
                        4.1 Host agrees to comply with all applicable laws, regulations, and ordinances, including but not limited to zoning laws, tax laws, and rental regulations, related to the use and rental of the Property.
                    </Text>
                    <Text style={styles.paragraph}>
                        4.2 Host acknowledges that they are solely responsible for obtaining any necessary permits, licenses, or approvals required for the operation of the Property as a rental accommodation.
                    </Text>
                    <Text style={styles.paragraph}>
                        4.3 If the Property is subject to any legal disputes or restrictions, Host agrees to provide a No Objection Certificate from relevant authorities confirming that there are no objections to renting out the Property.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.heading}>5. Insurance and Liability</Text>
                    <Text style={styles.paragraph}>
                        5.1 Host acknowledges that they are responsible for obtaining and maintaining appropriate insurance coverage for the Property, including liability insurance, to protect against any losses, damages, or claims arising from the use of the Property by guests.
                    </Text>
                    <Text style={styles.paragraph}>
                        5.2 Host agrees to indemnify and hold harmless the Company, its officers, directors, employees, and agents from any claims, damages, losses, or liabilities arising from the Host's breach of this Agreement or the use of the Property by guests.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.heading}>6. Termination</Text>
                    <Text style={styles.paragraph}>
                        6.1 This Agreement may be terminated by either party upon written notice to the other party.
                    </Text>
                    <Text style={styles.paragraph}>
                        6.2 Upon termination of this Agreement, Host agrees to remove the Property listing from the Platform and cease all use of the Company's services and resources.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.heading}>7. Miscellaneous</Text>
                    <Text style={styles.paragraph}>
                        7.1 This Agreement constitutes the entire agreement between the parties regarding the subject matter herein and supersedes all prior or contemporaneous agreements, understandings, or representations, whether written or oral.
                    </Text>
                    <Text style={styles.paragraph}>
                        7.2 This Agreement shall be governed by and construed in accordance with the laws of India, without regard to its conflict of laws principles.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.paragraph}>
                        IN WITNESS WHEREOF, the parties have executed this Agreement as of {dateStr}
                    </Text>
                </View>

                <View style={styles.signatureBlock}>
                    <Text style={styles.signatureLabel}>Host Signature</Text>
                    {signatureUrl ? (
                        <Image src={signatureUrl} style={styles.signatureImage} />
                    ) : (
                        <Text style={{ color: '#9ca3af', fontSize: 9 }}>[Signature Pending]</Text>
                    )}
                </View>

                <View style={{ marginTop: 20 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 10 }}>Company: Arkanet Ventures LLP</Text>
                </View>

                <View style={styles.footer} fixed>
                    <Text>ContCave Host Agreement • Arkanet Ventures LLP</Text>
                </View>
            </Page>
        </Document>
    );
};

export default AgreementDocument;
