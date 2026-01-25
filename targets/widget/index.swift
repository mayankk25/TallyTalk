import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entry = SimpleEntry(date: Date())
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
}

struct WidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView()
        case .systemMedium:
            MediumWidgetView()
        default:
            SmallWidgetView()
        }
    }
}

struct SmallWidgetView: View {
    var body: some View {
        ZStack {
            Color.black

            VStack(spacing: 8) {
                Image(systemName: "mic.fill")
                    .font(.system(size: 32, weight: .medium))
                    .foregroundColor(.white)

                Text("Record")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)

                Text("Expense")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.7))
            }
        }
        .widgetURL(URL(string: "budgetapp://record"))
    }
}

struct MediumWidgetView: View {
    var body: some View {
        ZStack {
            Color.black

            HStack(spacing: 20) {
                VStack(spacing: 8) {
                    ZStack {
                        Circle()
                            .fill(Color.white.opacity(0.15))
                            .frame(width: 56, height: 56)

                        Image(systemName: "mic.fill")
                            .font(.system(size: 24, weight: .medium))
                            .foregroundColor(.white)
                    }

                    Text("Record")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white)
                }

                Rectangle()
                    .fill(Color.white.opacity(0.2))
                    .frame(width: 1, height: 60)

                VStack(alignment: .leading, spacing: 4) {
                    Text("VoiceBudget")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)

                    Text("Tap to add expense")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))

                    Text("by voice")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                }

                Spacer()
            }
            .padding(.horizontal, 20)
        }
        .widgetURL(URL(string: "budgetapp://record"))
    }
}

@main
struct QuickRecordWidget: Widget {
    let kind: String = "QuickRecordWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Quick Record")
        .description("Tap to quickly record an expense by voice.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
