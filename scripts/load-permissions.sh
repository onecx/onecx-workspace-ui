#!/bin/bash

# relative paths to values.yaml and Chart.yaml
values_file="helm/values.yaml"
chart_file="helm/Chart.yaml"

array=()

if [ ! -f "$values_file" ]; then
    echo "\"$values_file\" cannot be found - execute this script from product root directory"
    exit 1
fi
if [ ! -f "$chart_file" ]; then
    echo "\"$chart_file\" cannot be found - execute this script from product root directory"
    exit 1
fi

extract_app_id_and_product_name() {
    app_id=$(sed -n '2 s/^name: \([^ ]*\).*/\1/p' "$chart_file")
    app_name=$(sed -n '4 s/description: //p' "$chart_file")
    product_name=$(echo "$app_id" | sed 's/-ui$//')
    echo "=> app id: $app_id"
    echo "=> app name: $app_name"
    echo "=> product name: $product_name"
}

find_permissions() {
    while IFS= read -r line; do
        if [[ "$line" == *"permissions:"* ]]; then
            permissions_spaces=$(echo "$line" | grep -oE '^[[:space:]]*' | wc -c)

            while IFS= read -r next_line; do
                next_spaces=$(echo "$next_line" | grep -oE '^[[:space:]]*' | wc -c)

                if (( next_spaces <= permissions_spaces )); then
                    break
                fi
                if (( next_spaces == permissions_spaces + 2 )); then
                    current_key=$(echo "$next_line" | tr -d ':' | tr -d ' ')
                elif (( next_spaces == permissions_spaces + 4 )); then
                    value=$(echo "$next_line" | awk -F ':' '{print $1}' | tr -d ' ')
                    description=$(echo "$next_line" | awk -F ':' '{$1=""; print $0}' | sed 's/^ *//')
                    echo -e "Key: $current_key \t Value: $value \t Description: $description"
                    array+=( "{\"resource\":\"$current_key\",\"action\":\"$value\",\"description\":\"$description\"}" )
                fi
            done < <(sed -n "/permissions:/,/^$/p" "$values_file" | tail -n +2)
            break
        fi
    done < "$values_file"
}

create_json() {
    permissions_json="{"
    permissions_json+="\"name\": \"$app_name\","
    permissions_json+="\"description\": \"local permission import\","
    permissions_json+="\"permissions\":["

    for ((i = 0; i < ${#array[@]}; i++)); do
        permissions_json+="${array[i]}"
        if ((i < ${#array[@]} - 1)); then
            permissions_json+=","
        fi
    done

    permissions_json+="]"
    permissions_json+="}"
}

send_permission_to_svc() {
    echo "=> send permissions to service"
    curl -v -X PUT -H "Content-Type: application/json" -d "$permissions_json" \
        http://onecx-permission-svc/operator/v1/$product_name/$app_id
}

extract_app_id_and_product_name
find_permissions
create_json
send_permission_to_svc
exit 0